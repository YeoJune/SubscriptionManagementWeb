// lib/deliveryManager.js
const db = require('./db');
const sms = require('./sms');

// 환경변수에서 배송 요일 가져오기
const getDeliveryDays = () => {
  const deliveryDaysEnv = process.env.DELIVERY_DAYS || '1,3,5';
  return deliveryDaysEnv.split(',').map((day) => parseInt(day.trim()));
};

// 다음 배송 요일 계산
function getNextDeliveryDates(count) {
  const dates = [];
  const today = new Date();
  let currentDate = new Date(today);
  const deliveryDays = getDeliveryDays();

  while (dates.length < count) {
    currentDate.setDate(currentDate.getDate() + 1);
    const dayOfWeek = currentDate.getDay();

    if (deliveryDays.includes(dayOfWeek)) {
      const formattedDate = currentDate.toISOString().split('T')[0];
      dates.push(formattedDate);
    }
  }

  return dates;
}

// 기존 자동 배송 일정 생성
async function createDeliverySchedule(user_id, product_id, count) {
  const deliveryDates = getNextDeliveryDates(count);
  return createDeliveryFromDates(user_id, product_id, deliveryDates);
}

// 새로운 커스텀 배송 일정 생성
async function createCustomDeliverySchedule(
  user_id,
  product_id,
  selectedDates
) {
  return createDeliveryFromDates(user_id, product_id, selectedDates);
}

// 공통 배송 생성 로직
async function createDeliveryFromDates(user_id, product_id, deliveryDates) {
  return new Promise((resolve, reject) => {
    try {
      const count = deliveryDates.length;
      const deliveries = [];

      // 잔여 횟수 확인
      db.get(
        `SELECT remaining_count FROM user_product_delivery 
         WHERE user_id = ? AND product_id = ?`,
        [user_id, product_id],
        (err, result) => {
          if (err) {
            reject(err);
            return;
          }

          const remainingCount = result ? result.remaining_count : 0;
          if (remainingCount < count) {
            reject(new Error('배송 잔여 횟수가 부족합니다.'));
            return;
          }

          // 트랜잭션 시작
          db.run('BEGIN TRANSACTION', (err) => {
            if (err) {
              reject(err);
              return;
            }

            let completedCount = 0;
            let hasError = false;

            // 배송 일정 생성
            deliveryDates.forEach((date) => {
              db.run(
                `INSERT INTO delivery_list (user_id, status, date, product_id) VALUES (?, ?, ?, ?)`,
                [user_id, 'pending', date, product_id],
                function (err) {
                  if (hasError) return;

                  if (err) {
                    hasError = true;
                    db.run('ROLLBACK', () => reject(err));
                    return;
                  }

                  deliveries.push({
                    id: this.lastID,
                    user_id,
                    date,
                    product_id,
                    status: 'pending',
                  });

                  completedCount++;

                  // 모든 배송 일정 생성 완료 시 잔여 횟수 차감
                  if (completedCount === deliveryDates.length) {
                    db.run(
                      `UPDATE user_product_delivery 
                       SET remaining_count = remaining_count - ?, updated_at = CURRENT_TIMESTAMP 
                       WHERE user_id = ? AND product_id = ?`,
                      [count, user_id, product_id],
                      function (err) {
                        if (err) {
                          hasError = true;
                          db.run('ROLLBACK', () => reject(err));
                          return;
                        }

                        db.run('COMMIT', (err) => {
                          if (err) {
                            db.run('ROLLBACK', () => reject(err));
                            return;
                          }
                          resolve(deliveries);
                        });
                      }
                    );
                  }
                }
              );
            });
          });
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

// 배송 상태 업데이트 함수
async function updateDeliveryStatus(delivery_id, status) {
  return new Promise((resolve, reject) => {
    try {
      // 기존 배송 정보 조회
      db.get(
        `SELECT * FROM delivery_list WHERE id = ?`,
        [delivery_id],
        (err, delivery) => {
          if (err) {
            reject(err);
            return;
          }

          if (!delivery) {
            reject(new Error('배송 정보를 찾을 수 없습니다.'));
            return;
          }

          // 트랜잭션 시작
          db.run('BEGIN TRANSACTION', (err) => {
            if (err) {
              reject(err);
              return;
            }

            // 배송 상태 업데이트
            db.run(
              `UPDATE delivery_list SET status = ? WHERE id = ?`,
              [status, delivery_id],
              function (err) {
                if (err) {
                  db.run('ROLLBACK', () => {
                    reject(err);
                  });
                  return;
                }

                if (this.changes === 0) {
                  db.run('ROLLBACK', () => {
                    reject(new Error('배송 상태 업데이트에 실패했습니다.'));
                  });
                  return;
                }

                // 배송 취소 시 잔여 횟수 증가
                if (status === 'cancel') {
                  db.run(
                    `INSERT INTO user_product_delivery (user_id, product_id, remaining_count)
                     VALUES (?, ?, 1)
                     ON CONFLICT(user_id, product_id) 
                     DO UPDATE SET remaining_count = remaining_count + 1, updated_at = CURRENT_TIMESTAMP`,
                    [delivery.user_id, delivery.product_id],
                    function (err) {
                      if (err) {
                        db.run('ROLLBACK', () => {
                          reject(err);
                        });
                        return;
                      }

                      finishUpdate();
                    }
                  );
                } else {
                  finishUpdate();
                }

                // 업데이트 완료 및 SMS 처리
                function finishUpdate() {
                  // 상태가 'complete'로 변경된 경우 SMS 발송
                  if (status === 'complete') {
                    db.get(
                      `SELECT u.phone_number, u.id, p.name AS product_name 
                       FROM users u, delivery_list d, product p
                       WHERE d.id = ? AND u.id = d.user_id AND p.id = d.product_id`,
                      [delivery_id],
                      (err, result) => {
                        if (err) {
                          console.error('SMS 발송 정보 조회 오류:', err);
                          // SMS 발송 실패해도 계속 진행
                        }

                        // 트랜잭션 커밋
                        db.run('COMMIT', (err) => {
                          if (err) {
                            db.run('ROLLBACK', () => {
                              reject(err);
                            });
                            return;
                          }

                          // SMS 발송 (트랜잭션 외부에서)
                          if (result) {
                            sms.sendDeliveryCompletionSMS(
                              result.phone_number,
                              result.id,
                              result.product_name,
                              delivery.date
                            );
                          }

                          resolve({ id: delivery_id, status });
                        });
                      }
                    );
                  } else {
                    // 트랜잭션 커밋
                    db.run('COMMIT', (err) => {
                      if (err) {
                        db.run('ROLLBACK', () => {
                          reject(err);
                        });
                        return;
                      }
                      resolve({ id: delivery_id, status });
                    });
                  }
                }
              }
            );
          });
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

// 당일 배송 목록 조회 함수
async function getTodayDeliveries() {
  return new Promise((resolve, reject) => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      db.all(
        `SELECT d.id, d.user_id, u.name AS user_name, d.status, d.date, d.product_id, 
                p.name AS product_name, u.phone_number, u.address
         FROM delivery_list d
         JOIN product p ON d.product_id = p.id
         JOIN users u ON d.user_id = u.id
         WHERE d.date = ?
         ORDER BY d.id ASC`,
        [today],
        (err, deliveries) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(deliveries);
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

// 사용자별 배송 횟수 확인 및 알림
async function checkDeliveryCount() {
  return new Promise((resolve, reject) => {
    try {
      // 상품별 배송 잔여 횟수가 적은 사용자 조회
      db.all(
        `SELECT u.id, u.phone_number, p.name AS product_name, upd.remaining_count
         FROM user_product_delivery upd
         JOIN users u ON upd.user_id = u.id
         JOIN product p ON upd.product_id = p.id
         WHERE upd.remaining_count <= 3
         ORDER BY upd.user_id, upd.product_id`,
        [],
        (err, results) => {
          if (err) {
            reject(err);
            return;
          }

          // 사용자별로 묶기
          const userMap = new Map();
          results.forEach((result) => {
            if (!userMap.has(result.id)) {
              userMap.set(result.id, {
                id: result.id,
                phone_number: result.phone_number,
                products: [],
              });
            }

            userMap.get(result.id).products.push({
              name: result.product_name,
              remaining_count: result.remaining_count,
            });
          });

          const users = Array.from(userMap.values());

          // 잔여 횟수 알림 발송
          users.forEach((user) => {
            // 모든 상품의 잔여 횟수가 0인지 확인
            const allEmpty = user.products.every(
              (prod) => prod.remaining_count <= 0
            );

            if (allEmpty) {
              // 모든 배송 횟수가 0 이하인 경우
              sms.sendDeliveryEmptySMS(user.phone_number, user.id);
            } else {
              // 배송 횟수가 적은 경우
              sms.sendProductDeliveryReminderSMS(
                user.phone_number,
                user.id,
                user.products
              );
            }
          });

          resolve(users);
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

// 사용자별 배송 목록 조회
async function getUserDeliveries(user_id, options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const { page = 1, limit = 10, status } = options;
      const offset = (page - 1) * limit;

      let query = `
        SELECT d.id, d.status, d.date, d.product_id, p.name AS product_name
        FROM delivery_list d
        JOIN product p ON d.product_id = p.id
        WHERE d.user_id = ?
      `;

      let countQuery = `
        SELECT COUNT(*) as total
        FROM delivery_list
        WHERE user_id = ?
      `;

      const queryParams = [user_id];
      const countParams = [user_id];

      // 상태 필터링이 있는 경우
      if (status) {
        query += ` AND d.status = ?`;
        countQuery += ` AND status = ?`;
        queryParams.push(status);
        countParams.push(status);
      }

      query += ` ORDER BY d.date DESC LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);

      // 전체 배송 수 조회
      db.get(countQuery, countParams, (err, countResult) => {
        if (err) {
          reject(err);
          return;
        }

        // 배송 목록 조회
        db.all(query, queryParams, (err, deliveries) => {
          if (err) {
            reject(err);
            return;
          }

          resolve({
            deliveries,
            pagination: {
              total: countResult.total,
              currentPage: page,
              totalPages: Math.ceil(countResult.total / limit),
              limit,
            },
          });
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}

// 사용자별 상품 배송 잔여 횟수 조회
async function getUserProductDeliveries(user_id) {
  return new Promise((resolve, reject) => {
    try {
      db.all(
        `SELECT upd.product_id, p.name AS product_name, upd.remaining_count
         FROM user_product_delivery upd
         JOIN product p ON upd.product_id = p.id
         WHERE upd.user_id = ?
         ORDER BY p.name ASC`,
        [user_id],
        (err, products) => {
          if (err) {
            reject(err);
            return;
          }

          resolve(products);
        }
      );
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  createDeliverySchedule,
  createCustomDeliverySchedule,
  updateDeliveryStatus,
  getTodayDeliveries,
  checkDeliveryCount,
  getUserDeliveries,
  getUserProductDeliveries,
};

// lib/deliveryManager.js
const db = require('./db');
const sms = require('./sms');

// 환경변수에서 배송 요일 가져오기
const getDeliveryDays = () => {
  const deliveryDaysEnv = process.env.DELIVERY_DAYS || '1,3,5';
  return deliveryDaysEnv.split(',').map((day) => parseInt(day.trim()));
};

// 관리자/사용자별 사용 가능한 배송 요일 반환
const getAvailableDeliveryDays = (isAdmin = false) => {
  if (isAdmin) {
    return [0, 1, 2, 3, 4, 5, 6]; // 관리자는 모든 요일 가능
  }
  return getDeliveryDays(); // 일반 사용자는 환경변수 기반
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
      const formattedDate = currentDate.toLocaleDateString('sv-SE'); // YYYY-MM-DD 형식
      dates.push(formattedDate);
    }
  }

  return dates;
}

// 기존 자동 배송 일정 생성
async function createDeliverySchedule(
  user_id,
  product_id,
  count,
  specialRequest = null,
  deliveryTime = null
) {
  const deliveryDates = getNextDeliveryDates(count);
  return createDeliveryFromDates(
    user_id,
    product_id,
    deliveryDates,
    specialRequest,
    deliveryTime
  );
}

// 새로운 커스텀 배송 일정 생성
async function createCustomDeliverySchedule(
  user_id,
  product_id,
  selectedDates,
  specialRequest = null,
  deliveryTime = null
) {
  return createDeliveryFromDates(
    user_id,
    product_id,
    selectedDates,
    specialRequest,
    deliveryTime
  );
}

// 공통 배송 생성 로직
async function createDeliveryFromDates(
  user_id,
  product_id,
  deliveryDates,
  specialRequest = null,
  deliveryTime = null
) {
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
            deliveryDates.forEach((date, index) => {
              const sequence = index + 1; // 순서 번호 할당

              db.run(
                `INSERT INTO delivery_list (user_id, status, date, product_id, special_request, delivery_sequence, delivery_time) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  user_id,
                  'pending',
                  date,
                  product_id,
                  specialRequest,
                  sequence,
                  deliveryTime,
                ],
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

// 🆕 개별 배송 날짜 수정 함수
async function updateDeliveryDate(deliveryId, newDate, isAdmin = false) {
  return new Promise((resolve, reject) => {
    try {
      // 날짜 형식 검증
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(newDate)) {
        reject(
          new Error('잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용해주세요.')
        );
        return;
      }

      const selectedDate = new Date(newDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      // 날짜 유효성 검증
      if (!isAdmin && selectedDate <= today) {
        reject(new Error('배송일은 내일 이후로 선택해주세요.'));
        return;
      }

      // 요일 제한 검증
      const dayOfWeek = selectedDate.getDay();
      const availableDays = getAvailableDeliveryDays(isAdmin);

      if (!availableDays.includes(dayOfWeek)) {
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const availableDayNames = availableDays
          .map((day) => dayNames[day])
          .join(', ');
        reject(new Error(`배송 가능 요일은 ${availableDayNames}입니다.`));
        return;
      }

      // 기존 배송 정보 조회
      db.get(
        `SELECT * FROM delivery_list WHERE id = ?`,
        [deliveryId],
        (err, delivery) => {
          if (err) {
            reject(err);
            return;
          }

          if (!delivery) {
            reject(new Error('배송 정보를 찾을 수 없습니다.'));
            return;
          }

          if (delivery.status !== 'pending') {
            reject(new Error('대기 중인 배송만 날짜를 수정할 수 있습니다.'));
            return;
          }

          // 동일한 사용자의 해당 날짜에 이미 배송이 있는지 확인
          db.get(
            `SELECT id FROM delivery_list 
             WHERE user_id = ? AND date = ? AND id != ?`,
            [delivery.user_id, newDate, deliveryId],
            (err, existingDelivery) => {
              if (err) {
                reject(err);
                return;
              }

              if (existingDelivery) {
                reject(new Error('해당 날짜에 이미 배송이 예약되어 있습니다.'));
                return;
              }

              // 배송 날짜 업데이트
              db.run(
                `UPDATE delivery_list SET date = ? WHERE id = ?`,
                [newDate, deliveryId],
                function (err) {
                  if (err) {
                    reject(err);
                    return;
                  }

                  if (this.changes === 0) {
                    reject(new Error('배송 날짜 업데이트에 실패했습니다.'));
                    return;
                  }

                  resolve({
                    id: deliveryId,
                    old_date: delivery.date,
                    new_date: newDate,
                    user_id: delivery.user_id,
                    product_id: delivery.product_id,
                  });
                }
              );
            }
          );
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
      // 한국 시간 기준으로 오늘 날짜 생성
      const today = new Date().toLocaleDateString('sv-SE'); // YYYY-MM-DD 형식

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

// ========== 새로 추가된 관리자용 스케줄 관리 함수들 ==========

// 사용자 정보 조회
const getUserInfo = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT id, name, phone_number, address, email
      FROM users
      WHERE id = ?
    `;

    db.get(query, [userId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

// 예약된 배송 일정 조회
const getScheduledDeliveries = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT d.id, d.date, d.status, d.product_id, d.delivery_sequence, p.name as product_name
      FROM delivery_list d
      JOIN product p ON d.product_id = p.id
      WHERE d.user_id = ? AND d.status = 'pending'
      ORDER BY d.date ASC
    `;

    db.all(query, [userId], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results || []);
      }
    });
  });
};

// 완료된 배송 조회
const getCompletedDeliveries = (userId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT d.id, d.date, d.status, d.product_id, p.name as product_name
      FROM delivery_list d
      JOIN product p ON d.product_id = p.id
      WHERE d.user_id = ? AND d.status = 'complete'
      ORDER BY d.date DESC
    `;

    db.all(query, [userId], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results || []);
      }
    });
  });
};

// 사용자 배송 스케줄 업데이트 (기존 pending 삭제 후 새로 생성)
const updateUserSchedule = (userId, deliveryDates, productId) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // 기존 pending 배송 삭제하고 잔여 횟수 복원
      const selectQuery = `
        SELECT COUNT(*) as count FROM delivery_list 
        WHERE user_id = ? AND status = 'pending'
      `;

      db.get(selectQuery, [userId], (err, countResult) => {
        if (err) {
          db.run('ROLLBACK');
          reject(err);
          return;
        }

        const pendingCount = countResult.count;

        // 기존 pending 배송 삭제
        const deleteQuery = `
          DELETE FROM delivery_list 
          WHERE user_id = ? AND status = 'pending'
        `;

        db.run(deleteQuery, [userId], (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          // 잔여 횟수 복원
          if (pendingCount > 0) {
            db.run(
              `INSERT INTO user_product_delivery (user_id, product_id, remaining_count)
               VALUES (?, ?, ?)
               ON CONFLICT(user_id, product_id) 
               DO UPDATE SET remaining_count = remaining_count + ?, updated_at = CURRENT_TIMESTAMP`,
              [userId, productId, pendingCount, pendingCount],
              (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  reject(err);
                  return;
                }

                createNewSchedule();
              }
            );
          } else {
            createNewSchedule();
          }
        });

        // 새로운 배송 일정 추가
        function createNewSchedule() {
          if (deliveryDates.length === 0) {
            db.run('COMMIT');
            resolve({ schedule: [] });
            return;
          }

          // 새 일정 생성을 위한 잔여 횟수 차감
          db.run(
            `UPDATE user_product_delivery 
             SET remaining_count = remaining_count - ?, updated_at = CURRENT_TIMESTAMP 
             WHERE user_id = ? AND product_id = ?`,
            [deliveryDates.length, userId, productId],
            function (err) {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }

              if (this.changes === 0) {
                db.run('ROLLBACK');
                reject(new Error('배송 잔여 횟수가 부족합니다.'));
                return;
              }

              const insertQuery = `
                INSERT INTO delivery_list (user_id, status, date, product_id, delivery_sequence)
                VALUES (?, 'pending', ?, ?, ?)
              `;

              let insertedCount = 0;
              const schedule = [];

              deliveryDates.forEach((date, index) => {
                const sequence = index + 1; // 순서 번호 할당

                db.run(
                  insertQuery,
                  [userId, date, productId, sequence],
                  function (err) {
                    if (err) {
                      db.run('ROLLBACK');
                      reject(err);
                      return;
                    }

                    schedule.push({
                      id: this.lastID,
                      user_id: userId,
                      date: date,
                      status: 'pending',
                      product_id: productId,
                    });

                    insertedCount++;

                    if (insertedCount === deliveryDates.length) {
                      db.run('COMMIT');
                      resolve({
                        schedule: schedule.sort((a, b) =>
                          a.date.localeCompare(b.date)
                        ),
                      });
                    }
                  }
                );
              });
            }
          );
        }
      });
    });
  });
};

// 배송 정보 조회 (ID로)
const getDeliveryById = (deliveryId) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT d.*, p.name as product_name, u.name as user_name
      FROM delivery_list d
      JOIN product p ON d.product_id = p.id
      JOIN users u ON d.user_id = u.id
      WHERE d.id = ?
    `;

    db.get(query, [deliveryId], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

// 배송 삭제 (잔여 횟수 복원 포함)
const deleteDeliveryAndRestoreCount = (deliveryId) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // 배송 정보 조회
      db.get(
        `SELECT * FROM delivery_list WHERE id = ?`,
        [deliveryId],
        (err, delivery) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          if (!delivery) {
            db.run('ROLLBACK');
            reject(new Error('배송 정보를 찾을 수 없습니다.'));
            return;
          }

          // 배송 삭제
          db.run(
            `DELETE FROM delivery_list WHERE id = ?`,
            [deliveryId],
            function (err) {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }

              // 잔여 횟수 복원 (pending 상태인 경우만)
              if (delivery.status === 'pending') {
                db.run(
                  `INSERT INTO user_product_delivery (user_id, product_id, remaining_count)
               VALUES (?, ?, 1)
               ON CONFLICT(user_id, product_id) 
               DO UPDATE SET remaining_count = remaining_count + 1, updated_at = CURRENT_TIMESTAMP`,
                  [delivery.user_id, delivery.product_id],
                  function (err) {
                    if (err) {
                      db.run('ROLLBACK');
                      reject(err);
                      return;
                    }

                    db.run('COMMIT');
                    resolve({ deletedId: deliveryId, changes: this.changes });
                  }
                );
              } else {
                db.run('COMMIT');
                resolve({ deletedId: deliveryId, changes: this.changes });
              }
            }
          );
        }
      );
    });
  });
};

// 배송 추가 (잔여 횟수 차감 포함)
const addDeliveryAndDeductCount = (userId, date, productId) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // 잔여 횟수 확인 및 차감
      db.run(
        `UPDATE user_product_delivery 
         SET remaining_count = remaining_count - 1, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = ? AND product_id = ? AND remaining_count > 0`,
        [userId, productId],
        function (err) {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          if (this.changes === 0) {
            db.run('ROLLBACK');
            reject(new Error('배송 잔여 횟수가 부족합니다.'));
            return;
          }

          // 배송 일정 추가
          db.run(
            `INSERT INTO delivery_list (user_id, status, date, product_id)
             VALUES (?, 'pending', ?, ?)`,
            [userId, date, productId],
            function (err) {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }

              db.run('COMMIT');
              resolve({
                id: this.lastID,
                user_id: userId,
                date: date,
                status: 'pending',
                product_id: productId,
              });
            }
          );
        }
      );
    });
  });
};

// 특정 사용자의 특정 날짜 배송 조회
const getDeliveryByUserAndDate = (userId, date) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM delivery_list
      WHERE user_id = ? AND date = ?
    `;

    db.get(query, [userId, date], (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

// 사용자 검색
const searchUsers = (searchQuery) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT u.id, u.name, u.phone_number, u.address, u.email,
             COUNT(d.id) as total_deliveries,
             COUNT(CASE WHEN d.status = 'pending' THEN 1 END) as pending_deliveries,
             COUNT(CASE WHEN d.status = 'complete' THEN 1 END) as completed_deliveries
      FROM users u
      LEFT JOIN delivery_list d ON u.id = d.user_id
      WHERE u.name LIKE ? OR u.phone_number LIKE ? OR u.id LIKE ?
      GROUP BY u.id, u.name, u.phone_number, u.address, u.email
      ORDER BY u.name ASC
      LIMIT 20
    `;

    const searchTerm = `%${searchQuery}%`;

    db.all(query, [searchTerm, searchTerm, searchTerm], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results || []);
      }
    });
  });
};

// 배송 횟수만 추가 (스케줄 생성 없이) - 결제 시 사용
const addDeliveryCount = (
  userId,
  productId,
  count,
  specialRequest = null,
  deliveryTime = null
) => {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO user_product_delivery (user_id, product_id, remaining_count)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, product_id) 
       DO UPDATE SET remaining_count = remaining_count + ?, updated_at = CURRENT_TIMESTAMP`,
      [userId, productId, count, count],
      function (err) {
        if (err) {
          reject(err);
          return;
        }

        resolve({
          user_id: userId,
          product_id: productId,
          added_count: count,
          message: `${count}회 배송이 추가되었습니다.`,
        });
      }
    );
  });
};

// 관리자용: 배송 횟수 추가 + 선택적 스케줄 생성
const adminAddDelivery = (
  userId,
  productId,
  deliveryCount,
  deliveryDates = null,
  specialRequest = null
) => {
  return new Promise((resolve, reject) => {
    // 스케줄이 있으면 한 번에 처리, 없으면 횟수만 추가
    if (deliveryDates && deliveryDates.length > 0) {
      // 스케줄이 있는 경우: 횟수 추가 + 스케줄 생성
      bulkAddDeliveryWithSchedule(
        userId,
        productId,
        deliveryDates,
        specialRequest
      )
        .then(resolve)
        .catch(reject);
    } else {
      // 스케줄이 없는 경우: 횟수만 추가
      addDeliveryCount(userId, productId, deliveryCount)
        .then(resolve)
        .catch(reject);
    }
  });
};

// 배송 횟수 추가 + 스케줄 생성 (한 번에 처리)
const bulkAddDeliveryWithSchedule = (
  userId,
  productId,
  deliveryDates,
  specialRequest = null,
  deliveryTime = null
) => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      // 1단계: 배송 횟수 추가
      db.run(
        `INSERT INTO user_product_delivery (user_id, product_id, remaining_count)
         VALUES (?, ?, ?)
         ON CONFLICT(user_id, product_id) 
         DO UPDATE SET remaining_count = remaining_count + ?, updated_at = CURRENT_TIMESTAMP`,
        [userId, productId, deliveryDates.length, deliveryDates.length],
        function (err) {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          // 2단계: 배송 스케줄 생성 (specialRequest와 deliveryTime 포함)
          const insertQuery = `
            INSERT INTO delivery_list (user_id, status, date, product_id, special_request, delivery_sequence, delivery_time)
            VALUES (?, 'pending', ?, ?, ?, ?, ?)
          `;

          let insertedCount = 0;
          const schedule = [];
          let hasError = false;

          deliveryDates.forEach((date, index) => {
            if (hasError) return;

            const sequence = index + 1; // 순서 번호 할당

            db.run(
              insertQuery,
              [userId, date, productId, specialRequest, sequence, deliveryTime],
              function (err) {
                if (err) {
                  hasError = true;
                  db.run('ROLLBACK');
                  reject(err);
                  return;
                }

                schedule.push({
                  id: this.lastID,
                  user_id: userId,
                  date: date,
                  status: 'pending',
                  product_id: productId,
                  special_request: specialRequest,
                  delivery_time: deliveryTime,
                });

                insertedCount++;

                if (insertedCount === deliveryDates.length) {
                  // 3단계: 추가된 스케줄만큼 잔여 횟수 차감
                  db.run(
                    `UPDATE user_product_delivery 
                   SET remaining_count = remaining_count - ?, updated_at = CURRENT_TIMESTAMP 
                   WHERE user_id = ? AND product_id = ?`,
                    [deliveryDates.length, userId, productId],
                    function (err) {
                      if (err) {
                        db.run('ROLLBACK');
                        reject(err);
                        return;
                      }

                      db.run('COMMIT');
                      resolve({
                        user_id: userId,
                        product_id: productId,
                        added_count: deliveryDates.length,
                        schedule: schedule.sort((a, b) =>
                          a.date.localeCompare(b.date)
                        ),
                        message: `${deliveryDates.length}회 배송이 추가되고 스케줄이 생성되었습니다.`,
                      });
                    }
                  );
                }
              }
            );
          });
        }
      );
    });
  });
};

// 결제 취소 시 해당 상품의 전체 구매 취소 처리
async function cancelPaymentDeliveries(user_id, product_id, purchased_count) {
  return new Promise((resolve, reject) => {
    // 트랜잭션 제거, serialize 유지로 순차 실행 보장
    db.serialize(() => {
      // pending 배송 개수 확인
      db.get(
        `SELECT COUNT(*) as pending_count 
         FROM delivery_list 
         WHERE user_id = ? AND product_id = ? AND status = 'pending'`,
        [user_id, product_id],
        (err, result) => {
          if (err) return reject(err);

          const pendingCount = result.pending_count;

          // pending 배송 삭제
          db.run(
            `DELETE FROM delivery_list 
             WHERE user_id = ? AND product_id = ? AND status = 'pending'`,
            [user_id, product_id],
            (err) => {
              if (err) return reject(err);

              // 잔여 횟수 차감
              db.run(
                `UPDATE user_product_delivery 
                 SET remaining_count = CASE 
                   WHEN remaining_count >= ? THEN remaining_count - ?
                   ELSE 0
                 END,
                 updated_at = CURRENT_TIMESTAMP
                 WHERE user_id = ? AND product_id = ?`,
                [purchased_count, purchased_count, user_id, product_id],
                function (err) {
                  if (err) return reject(err);

                  // 잔여 횟수가 0이 된 경우 레코드 삭제
                  db.run(
                    `DELETE FROM user_product_delivery 
                     WHERE user_id = ? AND product_id = ? AND remaining_count <= 0`,
                    [user_id, product_id],
                    (err) => {
                      if (err) return reject(err);

                      resolve({
                        user_id,
                        product_id,
                        deleted_pending_deliveries: pendingCount,
                        deducted_count: purchased_count,
                        message: `${purchased_count}회 구매가 취소되었습니다. ${pendingCount}개의 예정된 배송이 삭제되었습니다.`,
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    });
  });
}

// 순서 수정 함수 추가
const updateDeliverySequence = (deliveryId, newSequence) => {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE delivery_list SET delivery_sequence = ? WHERE id = ?`,
      [newSequence, deliveryId],
      function (err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: deliveryId, sequence: newSequence });
        }
      }
    );
  });
};

module.exports = {
  createDeliverySchedule,
  createCustomDeliverySchedule,
  updateDeliveryStatus,
  updateDeliveryDate,
  getTodayDeliveries,
  checkDeliveryCount,
  getUserDeliveries,
  getUserProductDeliveries,
  getUserInfo,
  getScheduledDeliveries,
  getCompletedDeliveries,
  updateUserSchedule,
  getDeliveryById,
  deleteDeliveryAndRestoreCount,
  addDeliveryAndDeductCount,
  getDeliveryByUserAndDate,
  searchUsers,
  addDeliveryCount,
  bulkAddDeliveryWithSchedule,
  adminAddDelivery,
  getAvailableDeliveryDays,
  cancelPaymentDeliveries,
  updateDeliverySequence, // 🆕 추가
};

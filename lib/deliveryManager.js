// lib/deliveryManager.js
const db = require('./db');
const sms = require('./sms');

// 배송 요일 (월수금)
const DELIVERY_DAYS = [1, 3, 5]; // 1:월, 3:수, 5:금

// 테이블 생성 확인
db.run(`
  CREATE TABLE IF NOT EXISTS delivery_list (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'complete', 'cancel')) NOT NULL DEFAULT 'pending',
    date TEXT NOT NULL,
    product_id INTEGER NOT NULL
  )
`);

// 다음 배송 요일 계산
function getNextDeliveryDates(count) {
  const dates = [];
  const today = new Date();
  let currentDate = new Date(today);

  // 오늘부터 시작해서 필요한 만큼의 배송일 찾기
  while (dates.length < count) {
    currentDate.setDate(currentDate.getDate() + 1); // 하루씩 증가

    // 요일 확인 (0: 일요일, 1: 월요일, ..., 6: 토요일)
    const dayOfWeek = currentDate.getDay();

    // 월수금(1, 3, 5)에 해당하는지 확인
    if (DELIVERY_DAYS.includes(dayOfWeek)) {
      // YYYY-MM-DD 형식으로 날짜 포맷팅
      const formattedDate = currentDate.toISOString().split('T')[0];
      dates.push(formattedDate);
    }
  }

  return dates;
}

// 배송 일정 생성 함수
async function createDeliverySchedule(user_id, product_id, count) {
  return new Promise((resolve, reject) => {
    try {
      const deliveryDates = getNextDeliveryDates(count);
      const deliveries = [];

      // SQLite에서는 Promise를 직접 지원하지 않으므로 카운터를 사용
      let completedCount = 0;

      deliveryDates.forEach((date) => {
        db.run(
          `INSERT INTO delivery_list (user_id, status, date, product_id) VALUES (?, ?, ?, ?)`,
          [user_id, 'pending', date, product_id],
          function (err) {
            if (err) {
              reject(err);
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
            if (completedCount === deliveryDates.length) {
              resolve(deliveries);
            }
          }
        );
      });
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

          // 배송 상태 업데이트
          db.run(
            `UPDATE delivery_list SET status = ? WHERE id = ?`,
            [status, delivery_id],
            function (err) {
              if (err) {
                reject(err);
                return;
              }

              if (this.changes === 0) {
                reject(new Error('배송 상태 업데이트에 실패했습니다.'));
                return;
              }

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
                      // SMS 발송 실패해도 배송 상태 업데이트는 성공으로 처리
                      resolve({ id: delivery_id, status });
                      return;
                    }

                    if (result) {
                      // SMS 발송
                      sms.sendDeliveryCompletionSMS(
                        result.phone_number,
                        result.id,
                        result.product_name,
                        delivery.date
                      );
                    }

                    resolve({ id: delivery_id, status });
                  }
                );
              } else {
                resolve({ id: delivery_id, status });
              }
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
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      db.all(
        `SELECT d.id, d.user_id, d.status, d.date, d.product_id, 
                p.name AS product_name, u.phone_number
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
      // 배송 잔여 횟수가 적은 사용자 조회
      db.all(
        `SELECT id, phone_number, delivery_count FROM users WHERE delivery_count <= 3`,
        [],
        (err, users) => {
          if (err) {
            reject(err);
            return;
          }

          // 잔여 횟수 알림 발송
          users.forEach((user) => {
            if (user.delivery_count <= 0) {
              // 배송 횟수가 0 이하인 경우
              sms.sendDeliveryEmptySMS(user.phone_number, user.id);
            } else {
              // 배송 횟수가 적은 경우 (1-3회)
              sms.sendDeliveryReminderSMS(
                user.phone_number,
                user.id,
                user.delivery_count
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

module.exports = {
  createDeliverySchedule,
  updateDeliveryStatus,
  getTodayDeliveries,
  checkDeliveryCount,
  getUserDeliveries,
};

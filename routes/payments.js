// routes/payments.js (나이스페이 통합 버전)
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { authMiddleware } = require('../lib/auth');
const deliveryManager = require('../lib/deliveryManager');
const axios = require('axios');
const crypto = require('crypto');
const { checkAdmin } = require('../lib/adminAuth');

// 나이스페이 설정
const NICEPAY_CLIENT_KEY = process.env.NICEPAY_CLIENT_KEY;
const NICEPAY_SECRET_KEY = process.env.NICEPAY_SECRET_KEY;
const NICEPAY_API_URL =
  process.env.NODE_ENV === 'production'
    ? 'https://api.nicepay.co.kr/v1/payments'
    : 'https://sandbox-api.nicepay.co.kr/v1/payments';

// Basic 인증 헤더 생성 함수
function generateBasicAuthHeader() {
  const credentials = `${NICEPAY_CLIENT_KEY}:${NICEPAY_SECRET_KEY}`;
  return `Basic ${Buffer.from(credentials).toString('base64')}`;
}

// 주문 ID 생성 함수
function generateOrderId() {
  return `ORDER_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

// HMAC SHA256 서명 생성 함수
function generateSignature(orderId, amount, timestamp) {
  return crypto
    .createHmac('sha256', NICEPAY_SECRET_KEY)
    .update(orderId + amount + timestamp)
    .digest('hex');
}

/*
payments 테이블 스키마
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  amount REAL NOT NULL,
  order_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  payment_gateway_transaction_id TEXT,
  raw_response_data TEXT,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
*/

// 결제 준비 - POST /api/payments/prepare
router.post('/prepare', authMiddleware, (req, res) => {
  try {
    const { product_id } = req.body;
    const user_id = req.session.user.id;

    // 유효성 검사
    if (!product_id) {
      return res.status(400).json({
        success: false,
        error: '상품은 필수 입력 사항입니다.',
      });
    }

    // 상품 정보 확인
    db.get(
      `SELECT * FROM product WHERE id = ?`,
      [product_id],
      (err, product) => {
        if (err) {
          return res.status(500).json({
            success: false,
            error: err.message,
          });
        }

        if (!product) {
          return res.status(404).json({
            success: false,
            error: '상품을 찾을 수 없습니다.',
          });
        }

        const orderId = generateOrderId();
        const amount = product.price;
        const timestamp = Date.now().toString();
        const signature = generateSignature(orderId, amount, timestamp);

        // 결제 정보 DB에 저장 (pending 상태)
        db.run(
          `INSERT INTO payments (
          user_id, product_id, count, amount, order_id, status
        ) VALUES (?, ?, ?, ?, ?, ?)`,
          [user_id, product_id, 1, amount, orderId, 'pending'],
          function (err) {
            if (err) {
              return res.status(500).json({
                success: false,
                error: err.message,
              });
            }

            const paymentId = this.lastID;

            // 나이스페이 SDK 파라미터 생성
            const paramsForNicePaySDK = {
              clientId: NICEPAY_CLIENT_KEY,
              method: 'card', // 기본 결제 수단
              orderId: orderId,
              amount: parseInt(amount),
              goodsName: product.name,
              returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-result`,
              timestamp: timestamp,
              signature: signature,
            };

            res.json({
              success: true,
              payment_id: paymentId,
              order_id: orderId,
              paramsForNicePaySDK,
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 결제 승인 요청 - POST /api/payments/approve
router.post('/approve', authMiddleware, (req, res) => {
  try {
    const { orderId, authToken, amount } = req.body;
    const user_id = req.session.user.id;

    if (!orderId || !authToken) {
      return res.status(400).json({
        success: false,
        error: '주문 번호와 인증 토큰이 누락되었습니다.',
      });
    }

    // 결제 정보 조회
    db.get(
      'SELECT * FROM payments WHERE order_id = ? AND user_id = ?',
      [orderId, user_id],
      async (err, payment) => {
        if (err) {
          return res.status(500).json({
            success: false,
            error: err.message,
          });
        }

        if (!payment) {
          return res.status(404).json({
            success: false,
            error: '해당 결제 정보를 찾을 수 없습니다.',
          });
        }

        if (payment.status !== 'pending') {
          return res.status(400).json({
            success: false,
            error: '이미 처리된 결제입니다.',
          });
        }

        try {
          // 나이스페이 결제 승인 API 호출
          const response = await axios.post(
            `${NICEPAY_API_URL}/${authToken}`,
            {
              amount: parseInt(payment.amount),
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: generateBasicAuthHeader(),
              },
            }
          );

          // 나이스페이 응답 처리
          if (response.data.resultCode === '0000') {
            // 결제 성공 처리
            const payMethod = response.data.payMethod || 'CARD';
            const tid = response.data.tid || '';

            // 트랜잭션 시작
            db.run('BEGIN TRANSACTION', (err) => {
              if (err) {
                return res.status(500).json({
                  success: false,
                  error: err.message,
                });
              }

              // 결제 상태 업데이트
              db.run(
                `UPDATE payments SET 
                  status = ?, 
                  payment_method = ?, 
                  payment_gateway_transaction_id = ?,
                  raw_response_data = ?,
                  paid_at = CURRENT_TIMESTAMP 
                WHERE id = ?`,
                [
                  'completed',
                  payMethod,
                  tid,
                  JSON.stringify(response.data),
                  payment.id,
                ],
                function (err) {
                  if (err) {
                    db.run('ROLLBACK');
                    return res.status(500).json({
                      success: false,
                      error: err.message,
                    });
                  }

                  // 상품 정보 조회
                  db.get(
                    'SELECT * FROM product WHERE id = ?',
                    [payment.product_id],
                    (err, product) => {
                      if (err) {
                        db.run('ROLLBACK');
                        return res.status(500).json({
                          success: false,
                          error: err.message,
                        });
                      }

                      // 사용자별 상품 배송 잔여 횟수 업데이트
                      db.run(
                        `INSERT INTO user_product_delivery (user_id, product_id, remaining_count)
                         VALUES (?, ?, ?)
                         ON CONFLICT(user_id, product_id) 
                         DO UPDATE SET remaining_count = remaining_count + ?, updated_at = CURRENT_TIMESTAMP`,
                        [
                          user_id,
                          payment.product_id,
                          product.delivery_count,
                          product.delivery_count,
                        ],
                        function (err) {
                          if (err) {
                            db.run('ROLLBACK');
                            return res.status(500).json({
                              success: false,
                              error: err.message,
                            });
                          }

                          // 트랜잭션 커밋
                          db.run('COMMIT', (err) => {
                            if (err) {
                              db.run('ROLLBACK');
                              return res.status(500).json({
                                success: false,
                                error: err.message,
                              });
                            }

                            // 배송 일정 생성 (트랜잭션 외부에서)
                            const deliveryPromise = req.body.selected_dates
                              ? deliveryManager.createCustomDeliverySchedule(
                                  user_id,
                                  payment.product_id,
                                  req.body.selected_dates
                                )
                              : deliveryManager.createDeliverySchedule(
                                  user_id,
                                  payment.product_id,
                                  product.delivery_count
                                );

                            deliveryPromise
                              .then((deliveries) => {
                                res.json({
                                  success: true,
                                  message: '결제가 성공적으로 처리되었습니다.',
                                  payment: {
                                    id: payment.id,
                                    order_id: payment.order_id,
                                    status: 'completed',
                                    amount: payment.amount,
                                    paid_at: new Date(),
                                    receipt_url:
                                      response.data.receiptUrl || null,
                                  },
                                  delivery_count: product.delivery_count,
                                  deliveries,
                                });
                              })
                              .catch((error) => {
                                // 배송 일정 생성 실패해도 결제는 성공으로 처리
                                console.error('배송 일정 생성 실패:', error);
                                res.json({
                                  success: true,
                                  message:
                                    '결제가 완료되었으나 배송 일정 생성 중 오류가 발생했습니다.',
                                  payment: {
                                    id: payment.id,
                                    order_id: payment.order_id,
                                    status: 'completed',
                                    amount: payment.amount,
                                    paid_at: new Date(),
                                    receipt_url:
                                      response.data.receiptUrl || null,
                                  },
                                });
                              });
                          });
                        }
                      );
                    }
                  );
                }
              );
            });
          } else {
            // 결제 실패 처리
            db.run(
              'UPDATE payments SET status = ?, raw_response_data = ? WHERE id = ?',
              ['failed', JSON.stringify(response.data), payment.id],
              (err) => {
                if (err) {
                  console.error('결제 실패 상태 업데이트 오류:', err);
                }
              }
            );

            res.status(400).json({
              success: false,
              error: `결제 승인 실패: ${response.data.resultMsg || '알 수 없는 오류'}`,
              errorCode: response.data.resultCode,
            });
          }
        } catch (apiError) {
          console.error('나이스페이 API 호출 중 오류:', apiError);

          // API 호출 실패 처리
          db.run(
            'UPDATE payments SET status = ?, raw_response_data = ? WHERE id = ?',
            [
              'approval_api_failed',
              JSON.stringify(apiError.response?.data || apiError.message),
              payment.id,
            ],
            (err) => {
              if (err) {
                console.error('API 실패 상태 업데이트 오류:', err);
              }
            }
          );

          res.status(500).json({
            success: false,
            error: '결제 승인 API 호출 중 오류가 발생했습니다.',
          });
        }
      }
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 결제 웹훅 처리 - POST /api/payments/webhook
router.post('/webhook', (req, res) => {
  try {
    const {
      resultCode,
      resultMsg,
      tid,
      orderId,
      ediDate,
      signature,
      status,
      paidAt,
      payMethod,
      amount,
      goodsName,
      receiptUrl,
      card,
    } = req.body;

    if (!orderId || !tid || !resultCode) {
      return res.status(400).send('Bad Request: Missing required parameters');
    }

    // 결제 정보 조회
    db.get(
      'SELECT * FROM payments WHERE order_id = ?',
      [orderId],
      (err, payment) => {
        if (err) {
          console.error('웹훅 DB 조회 오류:', err);
          return res.status(500).send('Internal Server Error');
        }

        if (!payment) {
          return res.status(404).send('Not Found: Order not found');
        }

        // 금액 검증
        if (parseFloat(payment.amount) !== parseFloat(amount)) {
          db.run(
            'UPDATE payments SET status = ?, raw_response_data = ? WHERE id = ?',
            ['auth_signature_mismatch', JSON.stringify(req.body), payment.id]
          );
          return res.status(400).send('Amount Mismatch');
        }

        // 결제 상태 결정
        let newStatus;
        if (status === 'paid' && resultCode === '0000') {
          newStatus = 'completed';
        } else if (status === 'ready' && resultCode === '0000') {
          newStatus = 'ready';
        } else if (status === 'vbankReady') {
          newStatus = 'vbank_ready';
        } else if (status === 'vbankExpired') {
          newStatus = 'vbank_expired';
        } else if (status === 'canceled') {
          newStatus = 'cancelled';
        } else {
          newStatus = 'failed';
        }

        // 웹훅 데이터 저장
        db.run(
          `UPDATE payments SET 
          status = ?, 
          payment_gateway_transaction_id = ?, 
          raw_response_data = ?,
          payment_method = ?,
          paid_at = ?
        WHERE id = ?`,
          [
            newStatus,
            tid,
            JSON.stringify(req.body),
            payMethod || payment.payment_method,
            paidAt || null,
            payment.id,
          ],
          (err) => {
            if (err) {
              console.error('웹훅 데이터 저장 오류:', err);
              return res.status(500).send('Internal Server Error');
            }

            // 200 응답 (나이스페이 웹훅은 200 OK 응답을 기대)
            res.status(200).send('OK');
          }
        );
      }
    );
  } catch (err) {
    console.error('결제 웹훅 처리 중 오류 발생:', err);
    res.status(500).send('Internal Server Error');
  }
});

// 결제 정보 조회 - GET /api/payments/:orderId
router.get('/:orderId', authMiddleware, (req, res) => {
  try {
    const orderId = req.params.orderId;
    const user_id = req.session.user.id;

    db.get(
      'SELECT * FROM payments WHERE order_id = ? AND user_id = ?',
      [orderId, user_id],
      (err, payment) => {
        if (err) {
          return res.status(500).json({
            success: false,
            error: err.message,
          });
        }

        if (!payment) {
          return res.status(404).json({
            success: false,
            error: '해당 결제 정보를 찾을 수 없습니다.',
          });
        }

        // raw_response_data가 있으면 JSON 파싱
        if (payment.raw_response_data) {
          try {
            payment.raw_response_data = JSON.parse(payment.raw_response_data);
          } catch (error) {
            console.error('결제 응답 데이터 파싱 오류:', error);
          }
        }

        res.json({
          success: true,
          payment: payment,
        });
      }
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 기존 결제 내역 조회 API (GET /api/payments)는 그대로 유지
router.get('/', authMiddleware, (req, res) => {
  try {
    const user_id = req.session.user.id;

    // 페이지네이션 처리
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 사용자의 결제 내역 조회 (완료된 결제만)
    const query = `
      SELECT p.id, p.product_id, p.count, p.amount, p.created_at, p.order_id, 
             p.status, p.payment_method, p.paid_at,
             pr.name as product_name, pr.delivery_count as product_delivery_count
      FROM payments p
      JOIN product pr ON p.product_id = pr.id
      WHERE p.user_id = ? AND p.status = 'completed'
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM payments
      WHERE user_id = ? AND status = 'completed'
    `;

    // 전체 결제 내역 수 조회
    db.get(countQuery, [user_id], (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 결제 내역 조회
      db.all(query, [user_id, limit, offset], (err, payments) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          payments,
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
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/payments - 관리자용 결제 내역 조회
router.get('/payments', checkAdmin, async (req, res) => {
  try {
    // 페이지네이션 처리
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 검색 및 필터링
    const { search, status, date_from, date_to } = req.query;

    // 정렬
    const sortBy = req.query.sortBy || 'created_at';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

    // 쿼리 구성
    let query = `
      SELECT p.id, p.user_id, p.product_id, p.count, p.amount, p.order_id, 
             p.status, p.payment_method, p.payment_gateway_transaction_id,
             p.paid_at, p.created_at,
             u.name AS user_name, u.phone_number AS user_phone,
             pr.name AS product_name
      FROM payments p
      JOIN users u ON p.user_id = u.id
      JOIN product pr ON p.product_id = pr.id
    `;

    let countQuery = `
      SELECT COUNT(*) as total
      FROM payments p
      JOIN users u ON p.user_id = u.id
      JOIN product pr ON p.product_id = pr.id
    `;

    // 조건 추가
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push(`p.status = ?`);
      params.push(status);
    }

    if (date_from) {
      conditions.push(`DATE(p.created_at) >= ?`);
      params.push(date_from);
    }

    if (date_to) {
      conditions.push(`DATE(p.created_at) <= ?`);
      params.push(date_to);
    }

    if (search) {
      conditions.push(
        `(u.name LIKE ? OR u.phone_number LIKE ? OR p.order_id LIKE ? OR pr.name LIKE ? OR u.id LIKE ?)`
      );
      params.push(
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`
      );
    }

    if (conditions.length > 0) {
      const whereClause = ` WHERE ${conditions.join(' AND ')}`;
      query += whereClause;
      countQuery += whereClause;
    }

    // 정렬 및 페이지네이션 추가
    query += ` ORDER BY p.${sortBy} ${order} LIMIT ? OFFSET ?`;

    // 전체 결제 수 조회
    db.get(countQuery, params, (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 결제 목록 조회
      db.all(query, [...params, limit, offset], (err, payments) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          payments,
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
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/payments/stats - 결제 통계 조회
router.get('/payments/stats', checkAdmin, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;

    let whereClause = '';
    let params = [];

    if (date_from || date_to) {
      const conditions = [];
      if (date_from) {
        conditions.push('DATE(created_at) >= ?');
        params.push(date_from);
      }
      if (date_to) {
        conditions.push('DATE(created_at) <= ?');
        params.push(date_to);
      }
      whereClause = ` WHERE ${conditions.join(' AND ')}`;
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as total_payments,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_payments,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_payments,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_payments,
        SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_amount,
        AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END) as avg_amount
      FROM payments${whereClause}
    `;

    db.get(statsQuery, params, (err, stats) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        stats: {
          total_payments: stats.total_payments || 0,
          completed_payments: stats.completed_payments || 0,
          failed_payments: stats.failed_payments || 0,
          pending_payments: stats.pending_payments || 0,
          total_amount: stats.total_amount || 0,
          avg_amount: stats.avg_amount || 0,
        },
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/admin/payments/:id - 특정 결제 상세 조회
router.get('/payments/:id', checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT p.*, u.name AS user_name, u.phone_number AS user_phone, u.email AS user_email,
             pr.name AS product_name, pr.price AS product_price
      FROM payments p
      JOIN users u ON p.user_id = u.id
      JOIN product pr ON p.product_id = pr.id
      WHERE p.id = ?
    `;

    db.get(query, [id], (err, payment) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (!payment) {
        return res.status(404).json({ error: '결제 정보를 찾을 수 없습니다.' });
      }

      // raw_response_data가 있으면 JSON 파싱
      if (payment.raw_response_data) {
        try {
          payment.raw_response_data = JSON.parse(payment.raw_response_data);
        } catch (error) {
          console.error('결제 응답 데이터 파싱 오류:', error);
        }
      }

      res.json({ payment });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

// routes/payments.js
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { authMiddleware } = require('../lib/auth');
const deliveryManager = require('../lib/deliveryManager');
const axios = require('axios');
const crypto = require('crypto');
const checkAdmin = require('../lib/checkAdmin');

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

// === 일반 사용자 결제 API ===

// POST /api/payments/prepare
router.post('/prepare', authMiddleware, (req, res) => {
  try {
    const { product_id, special_request } = req.body;
    const user_id = req.session.user.id;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        error: '상품은 필수 입력 사항입니다.',
      });
    }

    db.get(
      `SELECT * FROM product WHERE id = ?`,
      [product_id],
      (err, product) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
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

        db.run(
          `INSERT INTO payments (user_id, product_id, count, amount, order_id, status) VALUES (?, ?, ?, ?, ?, ?)`,
          [user_id, product_id, 1, amount, orderId, 'pending'],
          function (err) {
            if (err) {
              return res
                .status(500)
                .json({ success: false, error: err.message });
            }

            const paymentId = this.lastID;

            if (special_request) {
              req.session.special_request = special_request;
            }

            const paramsForNicePaySDK = {
              clientId: NICEPAY_CLIENT_KEY,
              method: 'card',
              orderId: orderId,
              amount: parseInt(amount),
              goodsName: product.name,
              returnUrl: `https://saluvallday.com/api/payments/payment-result`,
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
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payments/approve (올바른 버전)
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

    db.get(
      'SELECT * FROM payments WHERE order_id = ? AND user_id = ?',
      [orderId, user_id],
      async (err, payment) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }

        if (!payment) {
          return res.status(404).json({
            success: false,
            error: '해당 결제 정보를 찾을 수 없습니다.',
          });
        }

        // 이미 완료된 결제인지 확인
        if (payment.status === 'completed') {
          db.get(
            'SELECT * FROM product WHERE id = ?',
            [payment.product_id],
            (err, product) => {
              if (err) {
                return res
                  .status(500)
                  .json({ success: false, error: err.message });
              }

              return res.json({
                success: true,
                message: '이미 처리된 결제입니다.',
                payment: {
                  id: payment.id,
                  order_id: payment.order_id,
                  status: 'completed',
                  amount: payment.amount,
                  paid_at: payment.paid_at,
                  receipt_url: null,
                },
                delivery_count: product?.delivery_count || 0,
              });
            }
          );
          return;
        }

        // pending 또는 authenticated 상태가 아니면 에러
        if (
          payment.status !== 'pending' &&
          payment.status !== 'authenticated'
        ) {
          return res.status(400).json({
            success: false,
            error: `현재 결제 상태(${payment.status})에서는 승인할 수 없습니다.`,
          });
        }

        // payment_gateway_transaction_id(tid)가 있는지 확인
        const tid = payment.payment_gateway_transaction_id;
        if (!tid) {
          return res.status(400).json({
            success: false,
            error: '거래 ID(TID)가 없습니다. 인증이 완료되지 않은 결제입니다.',
          });
        }

        try {
          console.log(`나이스페이 승인 API 호출: ${NICEPAY_API_URL}/${tid}`);
          console.log('승인 요청 데이터:', {
            amount: parseInt(payment.amount),
          });

          // 나이스페이 승인 API 호출 (tid를 URL 경로에 포함)
          const response = await axios.post(
            `${NICEPAY_API_URL}/${tid}`,
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

          console.log('나이스페이 승인 API 응답:', response.data);

          if (response.data.resultCode === '0000') {
            const payMethod = response.data.payMethod || 'CARD';
            const finalTid = response.data.tid || tid;

            db.run('BEGIN TRANSACTION', (err) => {
              if (err) {
                return res
                  .status(500)
                  .json({ success: false, error: err.message });
              }

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
                  finalTid,
                  JSON.stringify(response.data),
                  payment.id,
                ],
                function (err) {
                  if (err) {
                    db.run('ROLLBACK');
                    return res
                      .status(500)
                      .json({ success: false, error: err.message });
                  }

                  db.get(
                    'SELECT * FROM product WHERE id = ?',
                    [payment.product_id],
                    (err, product) => {
                      if (err) {
                        db.run('ROLLBACK');
                        return res
                          .status(500)
                          .json({ success: false, error: err.message });
                      }

                      db.run('COMMIT', (err) => {
                        if (err) {
                          db.run('ROLLBACK');
                          return res
                            .status(500)
                            .json({ success: false, error: err.message });
                        }

                        // 세션에서 특별 요청사항 가져오기
                        const specialRequest =
                          req.session.special_request || null;
                        const selectedDates = req.body.selected_dates;
                        if (req.session.special_request) {
                          delete req.session.special_request;
                        }

                        let deliveryPromise;
                        if (selectedDates && selectedDates.length > 0) {
                          deliveryPromise =
                            deliveryManager.bulkAddDeliveryWithSchedule(
                              user_id,
                              payment.product_id,
                              selectedDates,
                              specialRequest
                            );
                        } else {
                          deliveryPromise = deliveryManager.addDeliveryCount(
                            user_id,
                            payment.product_id,
                            product.delivery_count
                          );
                        }

                        deliveryPromise
                          .then((result) => {
                            res.json({
                              success: true,
                              message: '결제가 성공적으로 처리되었습니다.',
                              payment: {
                                id: payment.id,
                                order_id: payment.order_id,
                                status: 'completed',
                                amount: payment.amount,
                                paid_at: new Date(),
                                receipt_url: response.data.receiptUrl || null,
                              },
                              delivery_count: product.delivery_count,
                              delivery_result: result,
                              deliveries: result.schedule || null,
                            });
                          })
                          .catch((error) => {
                            console.error('배송 처리 실패:', error);
                            res.json({
                              success: true,
                              message:
                                '결제가 완료되었으나 배송 처리 중 오류가 발생했습니다.',
                              payment: {
                                id: payment.id,
                                order_id: payment.order_id,
                                status: 'completed',
                                amount: payment.amount,
                                paid_at: new Date(),
                                receipt_url: response.data.receiptUrl || null,
                              },
                              error_detail: error.message,
                            });
                          });
                      });
                    }
                  );
                }
              );
            });
          } else {
            // 승인 실패
            db.run(
              'UPDATE payments SET status = ?, raw_response_data = ? WHERE id = ?',
              ['failed', JSON.stringify(response.data), payment.id]
            );

            res.status(400).json({
              success: false,
              error: `결제 승인 실패: ${response.data.resultMsg || '알 수 없는 오류'}`,
              errorCode: response.data.resultCode,
            });
          }
        } catch (apiError) {
          console.error('나이스페이 API 호출 중 오류:', apiError);
          console.error('API 오류 상세:', apiError.response?.data);

          // API 호출 실패
          db.run(
            'UPDATE payments SET status = ?, raw_response_data = ? WHERE id = ?',
            [
              'approval_api_failed',
              JSON.stringify(apiError.response?.data || apiError.message),
              payment.id,
            ]
          );

          res.status(500).json({
            success: false,
            error: '결제 승인 API 호출 중 오류가 발생했습니다.',
            details: apiError.response?.data || apiError.message,
          });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payments/webhook
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

        if (parseFloat(payment.amount) !== parseFloat(amount)) {
          db.run(
            'UPDATE payments SET status = ?, raw_response_data = ? WHERE id = ?',
            ['auth_signature_mismatch', JSON.stringify(req.body), payment.id]
          );
          return res.status(400).send('Amount Mismatch');
        }

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

        db.run(
          `UPDATE payments SET status = ?, payment_gateway_transaction_id = ?, raw_response_data = ?, payment_method = ?, paid_at = ? WHERE id = ?`,
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

// GET /api/payments (사용자 결제 내역)
router.get('/', authMiddleware, (req, res) => {
  try {
    const user_id = req.session.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

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

    const countQuery = `SELECT COUNT(*) as total FROM payments WHERE user_id = ? AND status = 'completed'`;

    db.get(countQuery, [user_id], (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

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

// GET /api/payments/admin/stats
router.get('/admin/stats', checkAdmin, (req, res) => {
  try {
    const { date_from, date_to, month, year } = req.query;

    let whereClause = '';
    let params = [];

    if (month && year) {
      whereClause = ` WHERE strftime('%Y-%m', created_at) = ?`;
      params.push(`${year}-${month.toString().padStart(2, '0')}`);
    } else if (date_from || date_to) {
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
        AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END) as avg_amount,
        COUNT(CASE WHEN status = 'completed' AND payment_method = 'CASH' THEN 1 END) as cash_payments,
        SUM(CASE WHEN status = 'completed' AND payment_method = 'CASH' THEN amount ELSE 0 END) as cash_amount
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
          cash_payments: stats.cash_payments || 0,
          cash_amount: stats.cash_amount || 0,
        },
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/payments/admin (현금 결제 추가)
router.post('/admin', checkAdmin, (req, res) => {
  try {
    const { user_id, product_id, amount, payment_memo } = req.body;

    if (!user_id || !product_id || !amount) {
      return res.status(400).json({
        success: false,
        error: '사용자, 상품, 금액은 필수 입력 사항입니다.',
      });
    }

    db.get('SELECT * FROM users WHERE id = ?', [user_id], (err, user) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }
      if (!user) {
        return res
          .status(404)
          .json({ success: false, error: '사용자를 찾을 수 없습니다.' });
      }

      db.get(
        'SELECT * FROM product WHERE id = ?',
        [product_id],
        (err, product) => {
          if (err) {
            return res.status(500).json({ success: false, error: err.message });
          }
          if (!product) {
            return res
              .status(404)
              .json({ success: false, error: '상품을 찾을 수 없습니다.' });
          }

          const orderId = generateOrderId();

          db.run(
            `INSERT INTO payments (user_id, product_id, count, amount, order_id, status, payment_method, paid_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [user_id, product_id, 1, amount, orderId, 'completed', 'CASH'],
            function (err) {
              if (err) {
                return res
                  .status(500)
                  .json({ success: false, error: err.message });
              }

              deliveryManager
                .addDeliveryCount(user_id, product_id, product.delivery_count)
                .then(() => {
                  res.json({
                    success: true,
                    message: '현금 결제가 성공적으로 등록되었습니다.',
                    payment: {
                      id: this.lastID,
                      order_id: orderId,
                      status: 'completed',
                      amount: amount,
                      payment_method: 'CASH',
                    },
                  });
                })
                .catch((deliveryError) => {
                  console.error('배송 처리 실패:', deliveryError);
                  res.json({
                    success: true,
                    message:
                      '현금 결제는 등록되었으나 배송 처리 중 오류가 발생했습니다.',
                    payment: {
                      id: this.lastID,
                      order_id: orderId,
                      status: 'completed',
                      amount: amount,
                      payment_method: 'CASH',
                    },
                    error_detail: deliveryError.message,
                  });
                });
            }
          );
        }
      );
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/payments/admin (관리자 결제 목록)
router.get('/admin', checkAdmin, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const { search, status, date_from, date_to } = req.query;
    const sortBy = req.query.sortBy || 'created_at';
    const order = req.query.order === 'asc' ? 'ASC' : 'DESC';

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

    query += ` ORDER BY p.${sortBy} ${order} LIMIT ? OFFSET ?`;

    db.get(countQuery, params, (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

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

// GET /api/payments/admin/:id (관리자 결제 상세)
router.get('/admin/:id', checkAdmin, (req, res) => {
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

// GET /api/payments/:orderId (특정 결제 조회)
router.get('/:orderId', authMiddleware, (req, res) => {
  try {
    const orderId = req.params.orderId;
    const user_id = req.session.user.id;

    db.get(
      'SELECT * FROM payments WHERE order_id = ? AND user_id = ?',
      [orderId, user_id],
      (err, payment) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }

        if (!payment) {
          return res.status(404).json({
            success: false,
            error: '해당 결제 정보를 찾을 수 없습니다.',
          });
        }

        if (payment.raw_response_data) {
          try {
            payment.raw_response_data = JSON.parse(payment.raw_response_data);
          } catch (error) {
            console.error('결제 응답 데이터 파싱 오류:', error);
          }
        }

        res.json({ success: true, payment: payment });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payments/payment-result (나이스페이 실제 데이터 기반)
router.post('/payment-result', (req, res) => {
  try {
    console.log('나이스페이 결제 결과 POST 데이터:', req.body);

    const {
      authResultCode,
      authResultMsg,
      tid,
      clientId,
      orderId,
      amount,
      authToken,
      signature,
    } = req.body;

    if (!orderId) {
      console.error('orderId가 없습니다:', req.body);
      return res.status(400).send(createErrorHtml('missing_order_id'));
    }

    // DB에서 해당 주문 조회
    db.get(
      'SELECT * FROM payments WHERE order_id = ?',
      [orderId],
      (err, payment) => {
        if (err) {
          console.error('DB 조회 오류:', err);
          return res.status(500).send(createErrorHtml('database_error'));
        }

        if (!payment) {
          console.error('결제 정보를 찾을 수 없음:', orderId);
          return res.status(404).send(createErrorHtml('payment_not_found'));
        }

        // 인증 성공 시
        if (authResultCode === '0000' && authToken) {
          // 인증 단계만 완료된 상태로 DB 업데이트
          db.run(
            `UPDATE payments SET 
             status = 'authenticated',
             payment_gateway_transaction_id = ?, 
             raw_response_data = ?
             WHERE id = ?`,
            [tid, JSON.stringify(req.body), payment.id],
            (updateErr) => {
              if (updateErr) {
                console.error('DB 업데이트 오류:', updateErr);
                return res.status(500).send(createErrorHtml('update_failed'));
              }

              // React 앱으로 리다이렉트 (인증 성공)
              const redirectUrl = `/payment-result?success=true&orderId=${orderId}&authToken=${authToken}&tid=${tid}&amount=${amount}&authResultCode=${authResultCode}`;
              res.send(createSuccessHtml(redirectUrl));
            }
          );
        }
        // 인증 실패 시
        else {
          // 실패 상태로 DB 업데이트
          db.run(
            `UPDATE payments SET 
             status = 'auth_failed',
             raw_response_data = ?
             WHERE id = ?`,
            [JSON.stringify(req.body), payment.id],
            (updateErr) => {
              if (updateErr) {
                console.error('DB 업데이트 오류:', updateErr);
              }

              // React 앱으로 리다이렉트 (인증 실패)
              const redirectUrl = `/payment-result?success=false&orderId=${orderId}&authResultCode=${authResultCode}&authResultMsg=${encodeURIComponent(authResultMsg || '인증 실패')}`;
              res.send(createErrorHtml('auth_failed', redirectUrl));
            }
          );
        }
      }
    );
  } catch (error) {
    console.error('결제 결과 처리 중 오류:', error);
    res.status(500).send(createErrorHtml('server_error'));
  }
});

// HTML 생성 헬퍼 함수들
function createSuccessHtml(redirectUrl) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>결제 처리 중...</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 400px;
          margin: 0 auto;
        }
        .spinner {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 20px auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="spinner"></div>
        <h2>결제 처리 중입니다...</h2>
        <p>잠시만 기다려 주세요.</p>
      </div>
      <script>
        setTimeout(function() {
          window.location.href = '${redirectUrl}';
        }, 1000);
      </script>
    </body>
    </html>
  `;
}

function createErrorHtml(errorType, redirectUrl = null) {
  const finalRedirectUrl =
    redirectUrl || `/payment-result?success=false&error=${errorType}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>오류 발생</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          text-align: center; 
          padding: 50px;
          background-color: #f5f5f5;
        }
        .container {
          background: white;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          max-width: 400px;
          margin: 0 auto;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>처리 중...</h2>
        <p>잠시 후 결과 페이지로 이동합니다.</p>
      </div>
      <script>
        setTimeout(function() {
          window.location.href = '${finalRedirectUrl}';
        }, 1000);
      </script>
    </body>
    </html>
  `;
}

module.exports = router;

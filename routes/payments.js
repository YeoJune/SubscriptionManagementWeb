// routes/payments.js
const express = require('express');
const router = express.Router();
const db = require('../lib/db');
const { authMiddleware } = require('../lib/auth');
const deliveryManager = require('../lib/deliveryManager');
const sms = require('../lib/sms');
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

        const deliveryInfo = JSON.stringify({
          special_request: req.body.special_request || null,
          delivery_address: req.body.delivery_address || null,
          delivery_time: req.body.delivery_time || null,
          selected_dates: null, // approve 시점에 업데이트
        });

        db.run(
          `INSERT INTO payments (user_id, product_id, count, amount, order_id, status, delivery_info) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [user_id, product_id, 1, amount, orderId, 'pending', deliveryInfo],
          function (err) {
            if (err) {
              return res
                .status(500)
                .json({ success: false, error: err.message });
            }

            const paymentId = this.lastID;

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

// POST /api/payments/approve
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
          // 🆕 케이터링 결제와 일반 결제 구분 처리
          const isCreteringPayment = payment.product_id < 0;

          if (isCreteringPayment) {
            // 케이터링 결제는 배송 카운트 없음
            return res.json({
              success: true,
              message: '이미 처리된 케이터링 결제입니다.',
              payment: {
                id: payment.id,
                order_id: payment.order_id,
                status: 'completed',
                amount: payment.amount,
                paid_at: payment.paid_at,
                receipt_url: null,
              },
              delivery_count: 0,
            });
          } else {
            // 기존 일반 상품 결제 처리
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
          }
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

              // 🆕 케이터링 결제 처리
              const isCateringPayment = payment.product_id < 0;

              if (isCateringPayment) {
                // 케이터링 결제 처리
                const inquiryId = Math.abs(payment.product_id);

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

                    // 🆕 문의 상태 업데이트 (결제 완료로 표시)
                    db.run(
                      'UPDATE inquiries SET payment_requested = TRUE WHERE id = ?',
                      [inquiryId],
                      (updateErr) => {
                        if (updateErr) {
                          console.error('문의 상태 업데이트 실패:', updateErr);
                        }

                        db.run('COMMIT', (err) => {
                          if (err) {
                            db.run('ROLLBACK');
                            return res
                              .status(500)
                              .json({ success: false, error: err.message });
                          }

                          res.json({
                            success: true,
                            message:
                              '케이터링 결제가 성공적으로 처리되었습니다.',
                            payment: {
                              id: payment.id,
                              order_id: payment.order_id,
                              status: 'completed',
                              amount: payment.amount,
                              paid_at: new Date(),
                              receipt_url: response.data.receiptUrl || null,
                            },
                            delivery_count: 0, // 케이터링은 배송 카운트 없음
                          });
                        });
                      }
                    );
                  }
                );
              } else {
                // 기존 일반 상품 결제 처리 (기존 코드 그대로 유지)
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

                          // 저장된 배송 정보 가져오기 및 업데이트
                          let deliveryInfo = {};
                          try {
                            deliveryInfo = JSON.parse(
                              payment.delivery_info || '{}'
                            );
                          } catch (e) {
                            console.error('배송 정보 파싱 오류:', e);
                          }

                          const specialRequest =
                            deliveryInfo.special_request || null;
                          const selectedDates =
                            req.body.selected_dates ||
                            deliveryInfo.selected_dates;

                          // 선택된 날짜가 있으면 delivery_info 업데이트
                          if (req.body.selected_dates) {
                            const updatedDeliveryInfo = {
                              ...deliveryInfo,
                              selected_dates: req.body.selected_dates,
                            };

                            db.run(
                              'UPDATE payments SET delivery_info = ? WHERE id = ?',
                              [JSON.stringify(updatedDeliveryInfo), payment.id]
                            );
                          }

                          let deliveryPromise;
                          if (selectedDates && selectedDates.length > 0) {
                            deliveryPromise =
                              deliveryManager.bulkAddDeliveryWithSchedule(
                                user_id,
                                payment.product_id,
                                selectedDates,
                                specialRequest,
                                deliveryInfo.delivery_time
                              );
                          } else {
                            deliveryPromise = deliveryManager.addDeliveryCount(
                              user_id,
                              payment.product_id,
                              product.delivery_count,
                              specialRequest,
                              deliveryInfo.delivery_time
                            );
                          }

                          deliveryPromise
                            .then(async (result) => {
                              // 결제 완료 알림톡 발송
                              try {
                                const userQuery =
                                  'SELECT name, phone_number FROM users WHERE id = ?';
                                db.get(userQuery, [user_id], (err, user) => {
                                  if (!err && user) {
                                    sms
                                      .sendPaymentCompletionAlimtalk(
                                        user.phone_number,
                                        user.name,
                                        product.name
                                      )
                                      .catch((smsError) => {
                                        console.error(
                                          '결제 완료 알림톡 발송 실패:',
                                          smsError
                                        );
                                      });
                                  }
                                });
                              } catch (smsError) {
                                console.error(
                                  '결제 완료 알림톡 발송 중 오류:',
                                  smsError
                                );
                              }

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
              }
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
      WHERE p.user_id = ? AND p.status IN ('completed', 'cash_pending', 'cancelled')
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

// GET /api/payments/admin/stats - 기존 API에 available_months 추가
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

    // 기존 통계 쿼리
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

    // 🆕 실제 데이터가 있는 년-월 목록 쿼리
    const availableMonthsQuery = `
      SELECT DISTINCT strftime('%Y-%m', created_at) as month
      FROM payments
      WHERE created_at IS NOT NULL
      ORDER BY month DESC
    `;

    // 두 쿼리를 병렬로 실행
    db.get(statsQuery, params, (err, stats) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.all(availableMonthsQuery, [], (monthErr, monthsResult) => {
        if (monthErr) {
          console.error('월별 데이터 조회 오류:', monthErr);
          // 오류가 있어도 기본 통계는 반환
        }

        const availableMonths = monthsResult
          ? monthsResult.map((row) => ({
              value: row.month,
              label: row.month,
              year: parseInt(row.month.split('-')[0]),
              month: parseInt(row.month.split('-')[1]),
            }))
          : [];

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
          available_months: availableMonths,
        });
      });
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🆕 새로운 API: 결제 전체 통계 (필터 조건 적용)
router.get('/admin/total-stats', checkAdmin, (req, res) => {
  try {
    const { search, status, date_from, date_to } = req.query;

    let query = `
      SELECT 
        COUNT(*) as total_payments,
        COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_payments,
        COUNT(CASE WHEN p.status = 'cash_pending' THEN 1 END) as cash_pending_payments,
        SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) as total_amount
      FROM payments p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN product pr ON p.product_id = pr.id AND p.product_id >= 0
      LEFT JOIN inquiries i ON p.product_id = -i.id AND p.product_id < 0
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
        `(u.name LIKE ? OR u.phone_number LIKE ? OR p.order_id LIKE ? OR 
          pr.name LIKE ? OR i.title LIKE ? OR u.id LIKE ?)`
      );
      params.push(
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`
      );
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    db.get(query, params, (err, result) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        total_stats: {
          total_payments: result.total_payments || 0,
          completed_payments: result.completed_payments || 0,
          cash_pending_payments: result.cash_pending_payments || 0,
          total_amount: result.total_amount || 0,
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

    // 🆕 케이터링 결제와 일반 결제를 모두 처리하는 쿼리
    let query = `
      SELECT p.id, p.user_id, p.product_id, p.count, p.amount, p.order_id, 
             p.status, p.payment_method, p.payment_gateway_transaction_id,
             p.depositor_name,
             p.paid_at, p.created_at,
             u.name AS user_name, u.phone_number AS user_phone,
             CASE 
               WHEN p.product_id >= 0 THEN pr.name 
               ELSE CONCAT('케이터링 서비스 - ', i.title)
             END AS product_name
      FROM payments p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN product pr ON p.product_id = pr.id AND p.product_id >= 0
      LEFT JOIN inquiries i ON p.product_id = -i.id AND p.product_id < 0
    `;

    let countQuery = `
      SELECT COUNT(*) as total
      FROM payments p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN product pr ON p.product_id = pr.id AND p.product_id >= 0
      LEFT JOIN inquiries i ON p.product_id = -i.id AND p.product_id < 0
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
        `(u.name LIKE ? OR u.phone_number LIKE ? OR p.order_id LIKE ? OR 
          pr.name LIKE ? OR i.title LIKE ? OR u.id LIKE ?)`
      );
      params.push(
        `%${search}%`,
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

// POST /api/payments/admin/:id/cancel (관리자 결제 취소)
router.post('/admin/:id/cancel', checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        error: '취소 사유는 필수 입력 사항입니다.',
      });
    }

    // 결제 정보 조회
    db.get(
      'SELECT * FROM payments WHERE id = ?',
      [id],
      async (err, payment) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }

        if (!payment) {
          return res.status(404).json({
            success: false,
            error: '결제 정보를 찾을 수 없습니다.',
          });
        }

        if (payment.status !== 'completed') {
          return res.status(400).json({
            success: false,
            error: '완료된 결제만 취소할 수 있습니다.',
          });
        }

        // 현금 결제와 카드 결제 분기 처리
        if (payment.payment_method === 'CASH') {
          // 현금 결제 취소 처리
          db.run('BEGIN TRANSACTION', (err) => {
            if (err) {
              return res
                .status(500)
                .json({ success: false, error: err.message });
            }

            // 결제 상태 업데이트
            db.run(
              `UPDATE payments 
               SET status = 'cancelled',
                   cancelled_reason = ?
               WHERE id = ?`,
              [reason, payment.id],
              async (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return res
                    .status(500)
                    .json({ success: false, error: err.message });
                }

                try {
                  // 배송 취소 처리
                  const deliveryResult =
                    await deliveryManager.cancelPaymentDeliveries(
                      payment.user_id,
                      payment.product_id,
                      payment.count
                    );

                  // 커밋
                  db.run('COMMIT', (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      return res
                        .status(500)
                        .json({ success: false, error: err.message });
                    }

                    res.json({
                      success: true,
                      message: '현금 결제가 성공적으로 취소되었습니다.',
                      payment: {
                        id: payment.id,
                        order_id: payment.order_id,
                        status: 'cancelled',
                        cancelled_reason: reason,
                      },
                      delivery_info: deliveryResult,
                    });
                  });
                } catch (deliveryError) {
                  db.run('ROLLBACK');
                  res.status(500).json({
                    success: false,
                    error: '배송 취소 처리 중 오류가 발생했습니다.',
                    details: deliveryError.message,
                  });
                }
              }
            );
          });
          return;
        }

        // 카드 결제 취소 처리 (기존 로직)
        if (!payment.payment_gateway_transaction_id) {
          return res.status(400).json({
            success: false,
            error: '거래 ID(TID)가 없어 취소할 수 없습니다.',
          });
        }

        try {
          // 나이스페이 취소 API 호출
          const cancelResponse = await axios.post(
            `${NICEPAY_API_URL}/${payment.payment_gateway_transaction_id}/cancel`,
            { reason: reason, orderId: payment.order_id },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: generateBasicAuthHeader(),
              },
            }
          );

          if (cancelResponse.data.resultCode !== '0000') {
            return res.status(400).json({
              success: false,
              error: `결제 취소 실패: ${
                cancelResponse.data.resultMsg || '알 수 없는 오류'
              }`,
              errorCode: cancelResponse.data.resultCode,
            });
          }

          // 트랜잭션 시작
          db.run('BEGIN TRANSACTION', (err) => {
            if (err) {
              return res
                .status(500)
                .json({ success: false, error: err.message });
            }

            // 결제 상태 업데이트
            db.run(
              `UPDATE payments 
             SET status = 'cancelled',
                 cancelled_reason = ?,
                 raw_response_data = ?
             WHERE id = ?`,
              [reason, JSON.stringify(cancelResponse.data), payment.id],
              async (err) => {
                if (err) {
                  db.run('ROLLBACK');
                  return res
                    .status(500)
                    .json({ success: false, error: err.message });
                }

                try {
                  // 배송 취소 처리
                  const deliveryResult =
                    await deliveryManager.cancelPaymentDeliveries(
                      payment.user_id,
                      payment.product_id,
                      payment.count
                    );

                  // 커밋
                  db.run('COMMIT', (err) => {
                    if (err) {
                      db.run('ROLLBACK');
                      return res
                        .status(500)
                        .json({ success: false, error: err.message });
                    }

                    res.json({
                      success: true,
                      message: '결제가 성공적으로 취소되었습니다.',
                      payment: {
                        id: payment.id,
                        order_id: payment.order_id,
                        status: 'cancelled',
                        cancelled_reason: reason,
                      },
                      delivery_info: deliveryResult,
                      partial_usage_notice:
                        deliveryResult.deleted_pending_deliveries <
                        payment.count
                          ? `주의: ${payment.count}회 중 ${
                              payment.count -
                              deliveryResult.deleted_pending_deliveries
                            }회는 이미 배송되었지만 전액 환불됩니다.`
                          : null,
                    });
                  });
                } catch (deliveryError) {
                  db.run('ROLLBACK');
                  res.status(500).json({
                    success: false,
                    error: '배송 취소 처리 중 오류가 발생했습니다.',
                    details: deliveryError.message,
                  });
                }
              }
            );
          });
        } catch (apiError) {
          console.error('나이스페이 취소 API 호출 중 오류:', apiError);
          res.status(500).json({
            success: false,
            error: '결제 취소 API 호출 중 오류가 발생했습니다.',
            details: apiError.response?.data || apiError.message,
          });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payments/cash/prepare (현금 결제 준비)
router.post('/cash/prepare', authMiddleware, (req, res) => {
  try {
    const { product_id, depositor_name } = req.body;
    const user_id = req.session.user.id;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        error: '상품은 필수 입력 사항입니다.',
      });
    }

    if (!depositor_name) {
      return res.status(400).json({
        success: false,
        error: '입금자명은 필수 입력 사항입니다.',
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
        const deliveryInfo = JSON.stringify({
          special_request: req.body.special_request || null,
          delivery_address: req.body.delivery_address || null,
          delivery_time: req.body.delivery_time || null,
          selected_dates: req.body.selected_dates || null,
        });

        db.run(
          `INSERT INTO payments (user_id, product_id, count, amount, order_id, status, payment_method, depositor_name, delivery_info) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user_id,
            product_id,
            1,
            amount,
            orderId,
            'cash_pending',
            'CASH',
            depositor_name,
            deliveryInfo,
          ],
          function (err) {
            if (err) {
              return res
                .status(500)
                .json({ success: false, error: err.message });
            }

            const paymentId = this.lastID;

            res.json({
              success: true,
              payment_id: paymentId,
              order_id: orderId,
              status: 'cash_pending',
              message:
                '현금 결제 요청이 등록되었습니다. 관리자 승인을 기다려주세요.',
              account_info: {
                bank: '카카오뱅크',
                account_number: '3333-30-8265756',
                account_holder: '김봉준',
                amount: amount,
                depositor_name: depositor_name,
              },
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payments/admin/:id/approve-cash (현금 결제 승인)
router.post('/admin/:id/approve-cash', checkAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { selected_dates } = req.body;

    db.get(
      'SELECT * FROM payments WHERE id = ?',
      [id],
      async (err, payment) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }

        if (!payment) {
          return res.status(404).json({
            success: false,
            error: '결제 정보를 찾을 수 없습니다.',
          });
        }

        if (payment.status !== 'cash_pending') {
          return res.status(400).json({
            success: false,
            error: '현금 결제 대기 상태가 아닙니다.',
          });
        }

        db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            return res.status(500).json({ success: false, error: err.message });
          }

          // 결제 상태를 completed로 변경
          db.run(
            `UPDATE payments SET 
             status = 'completed', 
             paid_at = CURRENT_TIMESTAMP 
             WHERE id = ?`,
            [payment.id],
            function (err) {
              if (err) {
                db.run('ROLLBACK');
                return res
                  .status(500)
                  .json({ success: false, error: err.message });
              }

              // 🆕 케이터링 결제와 일반 결제 구분 처리
              const isCateringPayment = payment.product_id < 0;

              if (isCateringPayment) {
                // 케이터링 결제 처리
                const inquiryId = Math.abs(payment.product_id);

                // 문의 상태 업데이트 (결제 완료로 표시)
                db.run(
                  'UPDATE inquiries SET payment_requested = TRUE WHERE id = ?',
                  [inquiryId],
                  (updateErr) => {
                    if (updateErr) {
                      console.error('문의 상태 업데이트 실패:', updateErr);
                    }

                    db.run('COMMIT', (err) => {
                      if (err) {
                        db.run('ROLLBACK');
                        return res
                          .status(500)
                          .json({ success: false, error: err.message });
                      }

                      // 케이터링 현금 결제 완료 알림톡 발송
                      try {
                        const userQuery =
                          'SELECT name, phone_number FROM users WHERE id = ?';
                        db.get(userQuery, [payment.user_id], (err, user) => {
                          if (!err && user) {
                            sms
                              .sendPaymentCompletionAlimtalk(
                                user.phone_number,
                                user.name,
                                `케이터링 서비스`
                              )
                              .catch((smsError) => {
                                console.error(
                                  '케이터링 현금 결제 완료 알림톡 발송 실패:',
                                  smsError
                                );
                              });
                          }
                        });
                      } catch (smsError) {
                        console.error(
                          '케이터링 현금 결제 완료 알림톡 발송 중 오류:',
                          smsError
                        );
                      }

                      res.json({
                        success: true,
                        message: '케이터링 현금 결제가 승인되었습니다.',
                        payment: {
                          id: payment.id,
                          order_id: payment.order_id,
                          status: 'completed',
                          amount: payment.amount,
                          depositor_name: payment.depositor_name,
                          paid_at: new Date(),
                        },
                        delivery_count: 0, // 케이터링은 배송 카운트 없음
                      });
                    });
                  }
                );
              } else {
                // 기존 일반 상품 결제 처리
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

                      // 저장된 배송 정보 가져오기
                      let deliveryInfo = {};
                      try {
                        deliveryInfo = JSON.parse(
                          payment.delivery_info || '{}'
                        );
                      } catch (e) {
                        console.error('배송 정보 파싱 오류:', e);
                      }

                      const specialRequest =
                        deliveryInfo.special_request || null;
                      const finalSelectedDates =
                        selected_dates || deliveryInfo.selected_dates;

                      // 배송 처리
                      let deliveryPromise;
                      if (finalSelectedDates && finalSelectedDates.length > 0) {
                        deliveryPromise =
                          deliveryManager.bulkAddDeliveryWithSchedule(
                            payment.user_id,
                            payment.product_id,
                            finalSelectedDates,
                            specialRequest,
                            deliveryInfo.delivery_time
                          );
                      } else {
                        deliveryPromise = deliveryManager.addDeliveryCount(
                          payment.user_id,
                          payment.product_id,
                          product.delivery_count,
                          specialRequest,
                          deliveryInfo.delivery_time
                        );
                      }

                      deliveryPromise
                        .then((result) => {
                          // 일반 상품 현금 결제 완료 알림톡 발송
                          try {
                            const userQuery =
                              'SELECT name, phone_number FROM users WHERE id = ?';
                            db.get(
                              userQuery,
                              [payment.user_id],
                              (err, user) => {
                                if (!err && user) {
                                  sms
                                    .sendPaymentCompletionAlimtalk(
                                      user.phone_number,
                                      user.name,
                                      product.name
                                    )
                                    .catch((smsError) => {
                                      console.error(
                                        '현금 결제 완료 알림톡 발송 실패:',
                                        smsError
                                      );
                                    });
                                }
                              }
                            );
                          } catch (smsError) {
                            console.error(
                              '현금 결제 완료 알림톡 발송 중 오류:',
                              smsError
                            );
                          }

                          res.json({
                            success: true,
                            message: '현금 결제가 승인되었습니다.',
                            payment: {
                              id: payment.id,
                              order_id: payment.order_id,
                              status: 'completed',
                              amount: payment.amount,
                              depositor_name: payment.depositor_name,
                              paid_at: new Date(),
                            },
                            delivery_count: product.delivery_count,
                            delivery_result: result,
                          });
                        })
                        .catch((error) => {
                          console.error('배송 처리 실패:', error);
                          res.json({
                            success: true,
                            message:
                              '현금 결제는 승인되었으나 배송 처리 중 오류가 발생했습니다.',
                            payment: {
                              id: payment.id,
                              order_id: payment.order_id,
                              status: 'completed',
                              amount: payment.amount,
                              depositor_name: payment.depositor_name,
                              paid_at: new Date(),
                            },
                            error_detail: error.message,
                          });
                        });
                    });
                  }
                );
              }
            }
          );
        });
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/payments/admin/:id/reject-cash (현금 결제 거절)
router.post('/admin/:id/reject-cash', checkAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    db.get('SELECT * FROM payments WHERE id = ?', [id], (err, payment) => {
      if (err) {
        return res.status(500).json({ success: false, error: err.message });
      }

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: '결제 정보를 찾을 수 없습니다.',
        });
      }

      if (payment.status !== 'cash_pending') {
        return res.status(400).json({
          success: false,
          error: '현금 결제 대기 상태가 아닙니다.',
        });
      }

      // 결제 상태를 failed로 변경
      db.run(
        `UPDATE payments SET 
           status = 'failed',
           cancelled_reason = ?
           WHERE id = ?`,
        [reason || '관리자에 의한 거절', payment.id],
        function (err) {
          if (err) {
            return res.status(500).json({ success: false, error: err.message });
          }

          res.json({
            success: true,
            message: '현금 결제가 거절되었습니다.',
            payment: {
              id: payment.id,
              order_id: payment.order_id,
              status: 'failed',
              cancelled_reason: reason || '관리자에 의한 거절',
            },
          });
        }
      );
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 🆕 POST /api/payments/catering-prepare - 케이터링 카드 결제 준비
router.post('/catering-prepare', authMiddleware, (req, res) => {
  try {
    const { inquiry_id, special_request } = req.body;
    const user_id = req.session.user.id;

    if (!inquiry_id) {
      return res.status(400).json({
        success: false,
        error: '문의 ID는 필수 입력 사항입니다.',
      });
    }

    // 문의 정보 및 권한 확인
    db.get(
      `SELECT * FROM inquiries WHERE id = ? AND user_id = ? AND payment_requested = TRUE`,
      [inquiry_id, user_id],
      (err, inquiry) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }

        if (!inquiry) {
          return res.status(404).json({
            success: false,
            error: '결제 요청된 문의를 찾을 수 없습니다.',
          });
        }

        const orderId = generateOrderId();
        const amount = inquiry.payment_amount;
        const timestamp = Date.now().toString();
        const signature = generateSignature(orderId, amount, timestamp);

        const deliveryInfo = JSON.stringify({
          special_request: special_request || null,
          inquiry_id: inquiry_id,
          inquiry_title: inquiry.title,
        });

        // payments 테이블에 저장 (product_id 대신 특별한 값 사용)
        db.run(
          `INSERT INTO payments (user_id, product_id, count, amount, order_id, status, delivery_info) VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [user_id, -inquiry_id, 1, amount, orderId, 'pending', deliveryInfo], // product_id를 -inquiry_id로 설정하여 구분
          function (err) {
            if (err) {
              return res
                .status(500)
                .json({ success: false, error: err.message });
            }

            const paymentId = this.lastID;

            const paramsForNicePaySDK = {
              clientId: NICEPAY_CLIENT_KEY,
              method: 'card',
              orderId: orderId,
              amount: parseInt(amount),
              goodsName: `케이터링 서비스 - ${inquiry.title}`,
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

// 🆕 POST /api/payments/catering-cash-prepare - 케이터링 현금 결제 준비
router.post('/catering-cash-prepare', authMiddleware, (req, res) => {
  try {
    const { inquiry_id, depositor_name, special_request } = req.body;
    const user_id = req.session.user.id;

    if (!inquiry_id) {
      return res.status(400).json({
        success: false,
        error: '문의 ID는 필수 입력 사항입니다.',
      });
    }

    if (!depositor_name) {
      return res.status(400).json({
        success: false,
        error: '입금자명은 필수 입력 사항입니다.',
      });
    }

    // 문의 정보 및 권한 확인
    db.get(
      `SELECT * FROM inquiries WHERE id = ? AND user_id = ? AND payment_requested = TRUE`,
      [inquiry_id, user_id],
      (err, inquiry) => {
        if (err) {
          return res.status(500).json({ success: false, error: err.message });
        }

        if (!inquiry) {
          return res.status(404).json({
            success: false,
            error: '결제 요청된 문의를 찾을 수 없습니다.',
          });
        }

        const orderId = generateOrderId();
        const amount = inquiry.payment_amount;
        const deliveryInfo = JSON.stringify({
          special_request: special_request || null,
          inquiry_id: inquiry_id,
          inquiry_title: inquiry.title,
        });

        db.run(
          `INSERT INTO payments (user_id, product_id, count, amount, order_id, status, payment_method, depositor_name, delivery_info) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            user_id,
            -inquiry_id, // product_id를 -inquiry_id로 설정하여 구분
            1,
            amount,
            orderId,
            'cash_pending',
            'CASH',
            depositor_name,
            deliveryInfo,
          ],
          function (err) {
            if (err) {
              return res
                .status(500)
                .json({ success: false, error: err.message });
            }

            const paymentId = this.lastID;

            res.json({
              success: true,
              payment_id: paymentId,
              order_id: orderId,
              status: 'cash_pending',
              message:
                '현금 결제 요청이 등록되었습니다. 관리자 승인을 기다려주세요.',
              account_info: {
                bank: '카카오뱅크',
                account_number: '3333-30-8265756',
                account_holder: '김봉준',
                amount: amount,
                depositor_name: depositor_name,
              },
            });
          }
        );
      }
    );
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;

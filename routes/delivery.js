// routes/delivery.js
const express = require('express');
const router = express.Router();
const checkAdmin = require('../lib/checkAdmin');
const { authMiddleware } = require('../lib/auth');
const db = require('../lib/db');
const deliveryManager = require('../lib/deliveryManager');

/*
-- 배달 목록 테이블 (delivery_list)
CREATE TABLE IF NOT EXISTS delivery_list (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'complete', 'cancel')) NOT NULL,
  date TEXT NOT NULL,
  product_id INTEGER NOT NULL
);
*/

// GET /api/delivery (admin) - 배송 목록 조회 (관리자용)
router.get('/', checkAdmin, async (req, res) => {
  try {
    // 페이지네이션 처리
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // 검색 및 필터링
    const { search, status, date } = req.query;

    // 정렬
    const sortBy = req.query.sortBy || 'date';
    const order = req.query.order === 'desc' ? 'DESC' : 'ASC';

    // 쿼리 구성
    let query = `
      SELECT d.id, d.user_id, u.name AS user_name, d.status, d.date, d.product_id, 
             p.name AS product_name, u.phone_number, u.address
      FROM delivery_list d
      JOIN product p ON d.product_id = p.id
      JOIN users u ON d.user_id = u.id
    `;

    let countQuery = `
      SELECT COUNT(*) as total
      FROM delivery_list d
      JOIN product p ON d.product_id = p.id
      JOIN users u ON d.user_id = u.id
    `;

    // 조건 추가
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push(`d.status = ?`);
      params.push(status);
    }

    if (date) {
      conditions.push(`d.date = ?`);
      params.push(date);
    }

    if (search) {
      conditions.push(
        `(u.id LIKE ? OR u.name LIKE ? OR p.name LIKE ? OR u.phone_number LIKE ?)`
      );
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      const whereClause = ` WHERE ${conditions.join(' AND ')}`;
      query += whereClause;
      countQuery += whereClause;
    }

    // 정렬 및 페이지네이션 추가
    query += ` ORDER BY d.${sortBy} ${order} LIMIT ? OFFSET ?`;

    // 전체 배송 수 조회
    db.get(countQuery, params, (err, countResult) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // 배송 목록 조회
      db.all(query, [...params, limit, offset], (err, deliveries) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
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
    res.status(500).json({ error: error.message });
  }
});

// GET /api/delivery/today (admin) - 당일 배송 목록 조회
router.get('/today', checkAdmin, async (req, res) => {
  try {
    const deliveries = await deliveryManager.getTodayDeliveries();
    res.json({ deliveries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/delivery/:id (admin) - 배송 상태 변경
router.put('/:id', checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // 유효성 검사
    if (!status) {
      return res.status(400).json({ error: '상태는 필수 입력 사항입니다.' });
    }

    if (!['pending', 'complete', 'cancel'].includes(status)) {
      return res.status(400).json({
        error: "상태는 'pending', 'complete', 'cancel' 중 하나여야 합니다.",
      });
    }

    // 배송 상태 업데이트
    const result = await deliveryManager.updateDeliveryStatus(id, status);

    // 사용자 배송 잔여 횟수 감소 (배송 취소 시)
    if (status === 'cancel') {
      db.get(
        `SELECT user_id FROM delivery_list WHERE id = ?`,
        [id],
        (err, delivery) => {
          if (err || !delivery) {
            console.error('배송 취소 시 사용자 정보 조회 오류:', err);
          } else {
            // 사용자의 배송 잔여 횟수 증가 (환불)
            db.run(
              `UPDATE users SET delivery_count = delivery_count + 1 WHERE id = ?`,
              [delivery.user_id],
              (err) => {
                if (err) {
                  console.error('배송 횟수 업데이트 오류:', err);
                }
              }
            );
          }
        }
      );
    }

    res.json({
      message: `배송 상태가 '${status}'로 변경되었습니다.`,
      delivery: result,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/delivery/check-counts (admin) - 배송 잔여 횟수 확인 및 알림 발송
router.get('/check-counts', checkAdmin, async (req, res) => {
  try {
    const users = await deliveryManager.checkDeliveryCount();
    res.json({
      message: '배송 잔여 횟수 확인 및 알림 발송 완료',
      users_notified: users.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/delivery/my (user) - 사용자 자신의 배송 목록 조회
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const user_id = req.session.user.id;
    const { page, limit, status } = req.query;

    const result = await deliveryManager.getUserDeliveries(user_id, {
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 10,
      status,
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/delivery/available-dates - 배송 가능 날짜 조회
router.get('/available-dates', authMiddleware, (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM 형식

    // month가 없으면 현재 월 사용
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    // 해당 월의 모든 날짜를 가져온 후 월/수/금만 필터링
    const availableDates = [];
    const [year, monthNum] = targetMonth.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1, 1);

    // 해당 월의 마지막 날짜 구하기
    const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();

    // 월/수/금(1, 3, 5) 날짜만 필터링
    for (let day = 1; day <= lastDay; day++) {
      date.setDate(day);
      const dayOfWeek = date.getDay();

      // 월(1), 수(3), 금(5)에 해당하는지 확인
      if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
        const formattedDate = date.toISOString().split('T')[0];
        availableDates.push(formattedDate);
      }
    }

    res.json({ available_dates: availableDates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

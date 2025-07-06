// routes/delivery.js
const express = require('express');
const router = express.Router();
const checkAdmin = require('../lib/checkAdmin');
const { authMiddleware } = require('../lib/auth');
const db = require('../lib/db');
const deliveryManager = require('../lib/deliveryManager');

// 환경변수에서 배송 가능 요일 가져오기
const getDeliveryDays = () => {
  const deliveryDaysEnv = process.env.DELIVERY_DAYS || '1,3,5'; // 기본값: 월,수,금
  return deliveryDaysEnv.split(',').map((day) => parseInt(day.trim()));
};

/*
-- 배달 목록 테이블 (delivery_list)
CREATE TABLE IF NOT EXISTS delivery_list (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'complete', 'cancel')) NOT NULL,
  date TEXT NOT NULL,
  product_id INTEGER NOT NULL
);

-- 사용자별 상품 배송 횟수 테이블 (user_product_delivery)
CREATE TABLE IF NOT EXISTS user_product_delivery (
  user_id TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  remaining_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, product_id)
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

// GET /api/delivery/available-dates - 배송 가능 날짜 조회 (사용자별 제한 적용)
router.get('/available-dates', authMiddleware, async (req, res) => {
  try {
    const user_id = req.session.user.id;
    const { month } = req.query; // YYYY-MM 형식

    // month가 없으면 현재 월 사용
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    // 1. 사용자의 총 배송 잔여 횟수 조회
    const userProducts =
      await deliveryManager.getUserProductDeliveries(user_id);
    const totalRemainingDeliveries = userProducts.reduce(
      (sum, product) => sum + product.remaining_count,
      0
    );

    if (totalRemainingDeliveries <= 0) {
      return res.json({
        available_dates: [],
        remaining_deliveries: 0,
        message: '남은 배송 횟수가 없습니다.',
      });
    }

    // 2. 이미 예약된 배송 일정 조회
    const scheduledDeliveries =
      await deliveryManager.getScheduledDeliveries(user_id);

    // 3. 최대 선택 가능 날짜 계산 (남은 배송 횟수 × 2일, 최대 한달)
    const maxSelectableDays = Math.min(totalRemainingDeliveries * 2, 30);

    // 4. 환경변수에서 배송 가능 요일 가져오기
    const deliveryDays = getDeliveryDays();

    // 5. 날짜 필터링 로직
    const availableDates = [];
    const today = new Date();
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + maxSelectableDays);

    const [year, monthNum] = targetMonth.split('-');
    const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(monthNum), 0);

    // 요청한 월의 범위를 maxDate로 제한
    const actualEndDate = endDate > maxDate ? maxDate : endDate;
    const actualStartDate = startDate < today ? today : startDate;

    for (
      let date = new Date(actualStartDate);
      date <= actualEndDate;
      date.setDate(date.getDate() + 1)
    ) {
      const dayOfWeek = date.getDay();

      // 환경변수에서 설정된 요일인지 확인
      if (deliveryDays.includes(dayOfWeek)) {
        const formattedDate = date.toISOString().split('T')[0];

        // 이미 예약된 날짜는 제외
        const isScheduled = scheduledDeliveries.some(
          (delivery) => delivery.date === formattedDate
        );
        if (!isScheduled) {
          availableDates.push(formattedDate);
        }
      }
    }

    res.json({
      available_dates: availableDates,
      remaining_deliveries: totalRemainingDeliveries,
      max_selectable_days: maxSelectableDays,
      scheduled_deliveries: scheduledDeliveries.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/delivery/products - 사용자별 상품 배송 잔여 횟수 조회
router.get('/products', authMiddleware, async (req, res) => {
  try {
    const user_id = req.session.user.id;

    const products = await deliveryManager.getUserProductDeliveries(user_id);
    res.json({ products });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/delivery/config - 배송 설정 정보 조회 (관리자/사용자 공통)
router.get('/config', (req, res) => {
  try {
    const deliveryDays = getDeliveryDays();

    // 요일명 매핑
    const dayNames = {
      0: '일요일',
      1: '월요일',
      2: '화요일',
      3: '수요일',
      4: '목요일',
      5: '금요일',
      6: '토요일',
    };

    const deliveryDayNames = deliveryDays.map((day) => dayNames[day]);

    res.json({
      delivery_days: deliveryDays,
      delivery_day_names: deliveryDayNames,
      delivery_schedule: `매주 ${deliveryDayNames.join(', ')} 배송`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ========== 관리자용 스케줄 관리 기능 ==========

// GET /api/delivery/users/search (admin) - 사용자 검색 (스케줄 관리용)
router.get('/users/search', checkAdmin, async (req, res) => {
  try {
    const { q } = req.query; // 검색 쿼리

    if (!q) {
      return res.status(400).json({ error: '검색어가 필요합니다.' });
    }

    const users = await deliveryManager.searchUsers(q);

    res.json({
      users: users,
      total: users.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/delivery/users/:userId/schedule (admin) - 특정 사용자의 배송 스케줄 조회
router.get('/users/:userId/schedule', checkAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // 사용자 정보 조회
    const user = await deliveryManager.getUserInfo(userId);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 상품별 배송 잔여 횟수 조회
    const userProducts = await deliveryManager.getUserProductDeliveries(userId);

    // 배송 스케줄 조회
    const scheduledDeliveries =
      await deliveryManager.getScheduledDeliveries(userId);

    // 완료된 배송 조회
    const completedDeliveries =
      await deliveryManager.getCompletedDeliveries(userId);

    const totalRemainingDeliveries = userProducts.reduce(
      (sum, product) => sum + product.remaining_count,
      0
    );

    res.json({
      user: {
        id: user.id,
        name: user.name,
        phone_number: user.phone_number,
        address: user.address,
      },
      user_products: userProducts,
      scheduled_deliveries: scheduledDeliveries,
      completed_deliveries: completedDeliveries,
      total_remaining_deliveries: totalRemainingDeliveries,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/delivery/users/:userId/schedule (admin) - 사용자 배송 스케줄 수정
router.put('/users/:userId/schedule', checkAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { delivery_dates, product_id } = req.body; // 배송 날짜 배열과 상품 ID

    if (!delivery_dates || !Array.isArray(delivery_dates)) {
      return res.status(400).json({ error: '배송 날짜 배열이 필요합니다.' });
    }

    if (!product_id) {
      return res.status(400).json({ error: '상품 ID가 필요합니다.' });
    }

    // 사용자 정보 확인
    const user = await deliveryManager.getUserInfo(userId);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 날짜 형식 및 유효성 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const date of delivery_dates) {
      if (!dateRegex.test(date)) {
        return res.status(400).json({
          error: `잘못된 날짜 형식입니다: ${date}. YYYY-MM-DD 형식을 사용해주세요.`,
        });
      }
    }

    // 중복 날짜 제거 및 정렬
    const uniqueDates = [...new Set(delivery_dates)].sort();

    // 기존 스케줄 삭제 후 새로 생성
    const result = await deliveryManager.updateUserSchedule(
      userId,
      uniqueDates,
      product_id
    );

    res.json({
      message: '배송 스케줄이 성공적으로 업데이트되었습니다.',
      user_id: userId,
      updated_schedule: result.schedule,
      total_scheduled: result.schedule.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/delivery/users/:userId/schedule/:deliveryId (admin) - 특정 배송 일정 삭제
router.delete(
  '/users/:userId/schedule/:deliveryId',
  checkAdmin,
  async (req, res) => {
    try {
      const { userId, deliveryId } = req.params;

      // 배송 정보 확인
      const delivery = await deliveryManager.getDeliveryById(deliveryId);
      if (!delivery) {
        return res.status(404).json({ error: '배송 정보를 찾을 수 없습니다.' });
      }

      if (delivery.user_id !== userId) {
        return res
          .status(400)
          .json({ error: '사용자 ID가 일치하지 않습니다.' });
      }

      if (delivery.status === 'complete') {
        return res
          .status(400)
          .json({ error: '완료된 배송은 삭제할 수 없습니다.' });
      }

      // 배송 일정 삭제 (잔여 횟수 복원 포함)
      await deliveryManager.deleteDeliveryAndRestoreCount(deliveryId);

      res.json({
        message: '배송 일정이 성공적으로 삭제되었습니다.',
        deleted_delivery: {
          id: delivery.id,
          date: delivery.date,
          status: delivery.status,
        },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// POST /api/delivery/users/:userId/schedule (admin) - 사용자에게 배송 일정 추가
router.post('/users/:userId/schedule', checkAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { date, product_id } = req.body;

    if (!date || !product_id) {
      return res
        .status(400)
        .json({ error: '배송 날짜와 상품 ID가 필요합니다.' });
    }

    // 사용자 정보 확인
    const user = await deliveryManager.getUserInfo(userId);
    if (!user) {
      return res.status(404).json({ error: '사용자를 찾을 수 없습니다.' });
    }

    // 날짜 형식 검증
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return res.status(400).json({
        error: '잘못된 날짜 형식입니다. YYYY-MM-DD 형식을 사용해주세요.',
      });
    }

    // 중복 날짜 확인
    const existingDelivery = await deliveryManager.getDeliveryByUserAndDate(
      userId,
      date
    );
    if (existingDelivery) {
      return res
        .status(400)
        .json({ error: '해당 날짜에 이미 배송이 예약되어 있습니다.' });
    }

    // 배송 일정 추가 (잔여 횟수 차감 포함)
    const newDelivery = await deliveryManager.addDeliveryAndDeductCount(
      userId,
      date,
      product_id
    );

    res.json({
      message: '배송 일정이 성공적으로 추가되었습니다.',
      delivery: newDelivery,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

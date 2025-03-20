// placeholder/users.js

// placeholder 데이터: 사용자 정보 정의
const users = [
  {
    id: 'user001',
    username: 'johnDoe',
    email: 'john@example.com',
    role: 'customer', // 고객 계정 (회원가입/로그인 방식)
    // 구독 내역 (Subscription Details)
    subscription: {
      plan: 'premium', // 구독 플랜 (예: premium, basic 등)
      startDate: '2025-03-15', // 구독 시작일
      endDate: '2025-06-15', // 구독 종료일
      status: 'active', // 구독 상태 (active, expired 등)
      remainingDeliveries: 5, // 남은 배송 횟수
      subscriptionHistory: [
        // 과거 구독 내역 기록
        {
          plan: 'basic',
          startDate: '2024-12-01',
          endDate: '2025-03-01',
          status: 'expired',
        },
      ],
    },
    // 배송 관리 (Delivery Management)
    deliveries: [
      {
        deliveryId: 'deliv001',
        orderId: 'order123',
        status: 'pending', // 배송 상태 (pending, delivered, cancelled 등)
        scheduledDate: '2025-03-20',
        trackingNumber: 'TRACK123456',
        address: '123 Main St, Anytown, Country',
      },
      {
        deliveryId: 'deliv002',
        orderId: 'order124',
        status: 'delivered',
        scheduledDate: '2025-03-10',
        trackingNumber: 'TRACK123457',
        address: '123 Main St, Anytown, Country',
      },
    ],
    // 알림 시스템 설정 (Notification Settings)
    notifications: {
      kakao: {
        enabled: true,
        template: 'customTemplate1',
      },
      sms: {
        enabled: true,
        phone: '+821012345678',
      },
    },
  },
  {
    id: 'user002',
    username: 'adminUser',
    email: 'admin@example.com',
    role: 'admin', // 관리자 계정 (관리자가 회원 등록 및 관리)
    subscription: null, // 관리자 계정은 구독 내역이 없음
    deliveries: [],
    notifications: {},
  },
];

module.exports = users;

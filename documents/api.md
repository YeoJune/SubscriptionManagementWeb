# 배송 관리 시스템 API 문서

이 문서는 배송 관리 시스템의 백엔드 API를 설명합니다. 프론트엔드 개발자가 API를 활용하여 사용자 인터페이스를 구축하는 데 필요한 정보를 제공합니다.

## 목차

1. [기본 정보](#기본-정보)
2. [인증 API](#인증-api)
3. [사용자 관리 API](#사용자-관리-api)
4. [상품 API](#상품-api)
5. [공지사항 API](#공지사항-api)
6. [고객의 소리 API](#고객의-소리-api)
7. [결제 API](#결제-api)
8. [배송 API](#배송-api)
9. [에러 처리](#에러-처리)
10. [모델 스키마](#모델-스키마)

## 기본 정보

### 기본 URL

```
http://localhost:3000/api
```

### 응답 형식

모든 API 응답은 JSON 형식으로 반환됩니다.

- 성공 응답: HTTP 상태 코드 2XX와 함께 요청 결과 데이터가 반환됩니다.
- 실패 응답: HTTP 상태 코드 4XX 또는 5XX와 함께 에러 메시지가 반환됩니다.

```json
// 성공 응답 예시
{
  "message": "작업이 성공적으로 완료되었습니다.",
  "data": { ... }
}

// 실패 응답 예시
{
  "error": "요청을 처리하는 도중 오류가 발생했습니다."
}
```

### 인증 방식

- 인증이 필요한 API는 세션 기반 인증을 사용합니다.
- 로그인 후 쿠키를 통해 세션이 유지됩니다.
- 관리자 권한이 필요한 API는 별도로 표시됩니다.

## 인증 API

### 회원가입

```
POST /api/auth/signup
```

**요청 본문:**

```json
{
  "id": "user123",
  "password": "securepassword",
  "name": "홍길동",
  "phone_number": "01012345678",
  "email": "user123@example.com",
  "address": "서울시 강남구"
}
```

**응답:**

```json
{
  "message": "회원가입이 완료되었습니다. 로그인해주세요.",
  "userId": "user123"
}
```

### 로그인

```
POST /api/auth/login
```

**요청 본문:**

```json
{
  "id": "user123",
  "password": "securepassword"
}
```

**응답:**

```json
{
  "message": "로그인 성공",
  "user": {
    "id": "user123",
    "name": "홍길동",
    "phone_number": "01012345678",
    "email": "user123@example.com",
    "address": "서울시 강남구",
    "delivery_count": 10,
    "isAdmin": false,
    "created_at": "2023-01-01T00:00:00.000Z",
    "last_login": "2023-01-05T00:00:00.000Z"
  }
}
```

### 로그아웃

```
POST /api/auth/logout
```

**응답:**

```json
{
  "message": "로그아웃 되었습니다."
}
```

### 사용자 정보 조회

```
GET /api/auth
```

**응답:**

```json
{
  "user": {
    "id": "user123",
    "name": "홍길동",
    "phone_number": "01012345678",
    "email": "user123@example.com",
    "address": "서울시 강남구",
    "delivery_count": 10,
    "isAdmin": false,
    "created_at": "2023-01-01T00:00:00.000Z",
    "last_login": "2023-01-05T00:00:00.000Z"
  }
}
```

## 사용자 관리 API

### 사용자 목록 조회 (관리자 전용)

```
GET /api/users
```

**쿼리 파라미터:**

- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 10)
- `search`: 검색어
- `sortBy`: 정렬 기준 (기본값: id)
- `order`: 정렬 순서 (asc/desc, 기본값: asc)

**응답:**

```json
{
  "users": [
    {
      "id": "user123",
      "name": "홍길동",
      "phone_number": "01012345678",
      "email": "user123@example.com",
      "address": "서울시 강남구",
      "delivery_count": 10,
      "created_at": "2023-01-01T00:00:00.000Z",
      "last_login": "2023-01-05T00:00:00.000Z"
    },
    ...
  ],
  "pagination": {
    "total": 50,
    "currentPage": 1,
    "totalPages": 5,
    "limit": 10
  }
}
```

### 특정 사용자 조회 (관리자 전용)

```
GET /api/users/:id
```

**응답:**

```json
{
  "id": "user123",
  "name": "홍길동",
  "phone_number": "01012345678",
  "email": "user123@example.com",
  "address": "서울시 강남구",
  "delivery_count": 10,
  "created_at": "2023-01-01T00:00:00.000Z",
  "last_login": "2023-01-05T00:00:00.000Z"
}
```

### 사용자 추가 (관리자 전용)

```
POST /api/users
```

**요청 본문:**

```json
{
  "id": "newuser",
  "password": "securepassword",
  "name": "김철수",
  "phone_number": "01087654321",
  "email": "newuser@example.com",
  "address": "부산시 해운대구",
  "delivery_count": 5
}
```

**응답:**

```json
{
  "id": "newuser",
  "message": "사용자가 성공적으로 생성되었습니다."
}
```

### 사용자 정보 수정 (관리자 전용)

```
PUT /api/users/:id
```

**요청 본문:**

```json
{
  "name": "김철수",
  "delivery_count": 15,
  "phone_number": "01012345678",
  "email": "updated@example.com",
  "address": "인천시 연수구",
  "password": "newpassword" // 선택 사항
}
```

**응답:**

```json
{
  "message": "사용자 정보가 성공적으로 업데이트되었습니다."
}
```

### 사용자 삭제 (관리자 전용)

```
DELETE /api/users/:id
```

**응답:**

```json
{
  "message": "사용자가 성공적으로 삭제되었습니다."
}
```

## 상품 API

### 상품 목록 조회

```
GET /api/products
```

**쿼리 파라미터:**

- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 10)
- `search`: 검색어
- `sortBy`: 정렬 기준 (기본값: name)
- `order`: 정렬 순서 (asc/desc, 기본값: asc)

**응답:**

```json
{
  "products": [
    {
      "id": 1,
      "name": "프리미엄 세트",
      "description": "고급 상품 세트",
      "price": 50000,
      "delivery_count": 10,
      "created_at": "2023-01-01T00:00:00.000Z"
    },
    ...
  ],
  "pagination": {
    "total": 20,
    "currentPage": 1,
    "totalPages": 2,
    "limit": 10
  }
}
```

### 특정 상품 조회

```
GET /api/products/:id
```

**응답:**

```json
{
  "id": 1,
  "name": "프리미엄 세트",
  "description": "고급 상품 세트",
  "price": 50000,
  "delivery_count": 10,
  "created_at": "2023-01-01T00:00:00.000Z"
}
```

### 상품 등록 (관리자 전용)

```
POST /api/products
```

**요청 본문:**

```json
{
  "name": "스페셜 세트",
  "description": "특별한 상품 세트",
  "price": 45000,
  "delivery_count": 8
}
```

**응답:**

```json
{
  "id": 2,
  "message": "상품이 성공적으로 등록되었습니다."
}
```

### 상품 수정 (관리자 전용)

```
PUT /api/products/:id
```

**요청 본문:**

```json
{
  "name": "스페셜 세트 V2",
  "description": "업그레이드된 특별 상품 세트",
  "price": 49000,
  "delivery_count": 9
}
```

**응답:**

```json
{
  "id": 2,
  "message": "상품이 성공적으로 수정되었습니다."
}
```

### 상품 삭제 (관리자 전용)

```
DELETE /api/products/:id
```

**응답:**

```json
{
  "message": "상품이 성공적으로 삭제되었습니다."
}
```

## 공지사항 API

### 공지사항 목록 조회

```
GET /api/notices
```

**쿼리 파라미터:**

- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 10)
- `type`: 공지 유형 (normal/faq)

**응답:**

```json
{
  "notices": [
    {
      "id": 1,
      "type": "normal",
      "title": "시스템 점검 안내",
      "content": "시스템 점검 예정입니다.",
      "created_at": "2023-01-01T00:00:00.000Z"
    },
    {
      "id": 2,
      "type": "faq",
      "title": "자주 묻는 질문",
      "question": "배송일을 변경할 수 있나요?",
      "answer": "현재는 지원하지 않습니다.",
      "created_at": "2023-01-02T00:00:00.000Z"
    },
    ...
  ],
  "pagination": {
    "total": 25,
    "currentPage": 1,
    "totalPages": 3,
    "limit": 10
  }
}
```

### 특정 공지사항 조회

```
GET /api/notices/:id
```

**응답:**

```json
{
  "id": 1,
  "type": "normal",
  "title": "시스템 점검 안내",
  "content": "시스템 점검 예정입니다.",
  "created_at": "2023-01-01T00:00:00.000Z"
}
```

### 공지사항 등록 (관리자 전용)

```
POST /api/notices
```

**요청 본문 (일반 공지):**

```json
{
  "type": "normal",
  "title": "서비스 개선 안내",
  "content": "서비스가 개선되었습니다."
}
```

**요청 본문 (FAQ):**

```json
{
  "type": "faq",
  "title": "배송 관련",
  "question": "배송 시간을 지정할 수 있나요?",
  "answer": "현재는 오전 중 배송만 가능합니다."
}
```

**응답:**

```json
{
  "id": 3,
  "message": "공지사항이 등록되었습니다."
}
```

### 공지사항 수정 (관리자 전용)

```
PUT /api/notices/:id
```

**요청 본문:**

```json
{
  "type": "normal",
  "title": "서비스 개선 안내 (수정)",
  "content": "서비스가 더욱 개선되었습니다."
}
```

**응답:**

```json
{
  "id": 3,
  "message": "공지사항이 수정되었습니다."
}
```

### 공지사항 삭제 (관리자 전용)

```
DELETE /api/notices/:id
```

**응답:**

```json
{
  "message": "공지사항이 삭제되었습니다."
}
```

## 고객의 소리 API

### 고객의 소리 목록 조회

```
GET /api/inquiries
```

**쿼리 파라미터:**

- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 10)
- `status`: 상태 필터링 (answered/unanswered)

**응답:**

```json
{
  "inquiries": [
    {
      "id": 1,
      "user_id": "user123",
      "user_name": "홍길동",
      "title": "배송 관련 문의",
      "content": "배송 일정을 변경할 수 있나요?",
      "answer": "현재는 배송 일정 변경이 어렵습니다.",
      "status": "answered",
      "created_at": "2023-01-01T00:00:00.000Z",
      "answered_at": "2023-01-02T00:00:00.000Z"
    },
    ...
  ],
  "pagination": {
    "total": 25,
    "currentPage": 1,
    "totalPages": 3,
    "limit": 10
  }
}
```

### 특정 고객의 소리 조회

```
GET /api/inquiries/:id
```

**응답:**

```json
{
  "id": 1,
  "user_id": "user123",
  "user_name": "홍길동",
  "title": "배송 관련 문의",
  "content": "배송 일정을 변경할 수 있나요?",
  "answer": "현재는 배송 일정 변경이 어렵습니다.",
  "status": "answered",
  "created_at": "2023-01-01T00:00:00.000Z",
  "answered_at": "2023-01-02T00:00:00.000Z"
}
```

### 문의 등록

```
POST /api/inquiries
```

**요청 본문:**

```json
{
  "title": "상품 관련 문의",
  "content": "새로운 상품이 출시될 예정인가요?"
}
```

**응답:**

```json
{
  "id": 2,
  "message": "문의가 등록되었습니다."
}
```

### 문의 답변 등록/수정 (관리자 전용)

```
PUT /api/inquiries/:id
```

**요청 본문:**

```json
{
  "answer": "다음 달에 새로운 상품이 출시될 예정입니다."
}
```

**응답:**

```json
{
  "id": 2,
  "message": "답변이 등록되었습니다."
}
```

## 결제 API

### 결제 처리

```
POST /api/payments
```

**요청 본문:**

```json
{
  "product_id": 1
}
```

**응답:**

```json
{
  "message": "결제 및 배송 일정 등록이 완료되었습니다.",
  "payment_id": 1,
  "amount": 50000,
  "delivery_count": 10,
  "deliveries": [
    {
      "id": 1,
      "user_id": "user123",
      "date": "2023-01-02",
      "product_id": 1,
      "status": "pending"
    },
    ...
  ]
}
```

### 결제 내역 조회

```
GET /api/payments
```

**쿼리 파라미터:**

- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 10)

**응답:**

```json
{
  "payments": [
    {
      "id": 1,
      "product_id": 1,
      "count": 1,
      "amount": 50000,
      "created_at": "2023-01-01T00:00:00.000Z",
      "product_name": "프리미엄 세트",
      "product_delivery_count": 10
    },
    ...
  ],
  "pagination": {
    "total": 5,
    "currentPage": 1,
    "totalPages": 1,
    "limit": 10
  }
}
```

## 배송 API

### 배송 목록 조회 (관리자 전용)

```
GET /api/delivery
```

**쿼리 파라미터:**

- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 10)
- `search`: 검색어
- `status`: 배송 상태 (pending/complete/cancel)
- `date`: 배송일 (YYYY-MM-DD)
- `sortBy`: 정렬 기준 (기본값: date)
- `order`: 정렬 순서 (asc/desc, 기본값: asc)

**응답:**

```json
{
  "deliveries": [
    {
      "id": 1,
      "user_id": "user123",
      "user_name": "홍길동",
      "status": "pending",
      "date": "2023-01-02",
      "product_id": 1,
      "product_name": "프리미엄 세트",
      "phone_number": "01012345678",
      "address": "서울시 강남구"
    },
    ...
  ],
  "pagination": {
    "total": 30,
    "currentPage": 1,
    "totalPages": 3,
    "limit": 10
  }
}
```

### 당일 배송 목록 조회 (관리자 전용)

```
GET /api/delivery/today
```

**응답:**

```json
{
  "deliveries": [
    {
      "id": 5,
      "user_id": "user123",
      "user_name": "홍길동",
      "status": "pending",
      "date": "2023-01-05",
      "product_id": 1,
      "product_name": "프리미엄 세트",
      "phone_number": "01012345678",
      "address": "서울시 강남구"
    },
    ...
  ]
}
```

### 배송 상태 변경 (관리자 전용)

```
PUT /api/delivery/:id
```

**요청 본문:**

```json
{
  "status": "complete"
}
```

**응답:**

```json
{
  "message": "배송 상태가 'complete'로 변경되었습니다.",
  "delivery": {
    "id": 5,
    "status": "complete"
  }
}
```

### 배송 잔여 횟수 확인 및 알림 발송 (관리자 전용)

```
GET /api/delivery/check-counts
```

**응답:**

```json
{
  "message": "배송 잔여 횟수 확인 및 알림 발송 완료",
  "users_notified": 3
}
```

### 개인 배송 목록 조회

```
GET /api/delivery/my
```

**쿼리 파라미터:**

- `page`: 페이지 번호 (기본값: 1)
- `limit`: 페이지당 항목 수 (기본값: 10)
- `status`: 배송 상태 (pending/complete/cancel)

**응답:**

```json
{
  "deliveries": [
    {
      "id": 1,
      "status": "pending",
      "date": "2023-01-02",
      "product_id": 1,
      "product_name": "프리미엄 세트"
    },
    ...
  ],
  "pagination": {
    "total": 10,
    "currentPage": 1,
    "totalPages": 1,
    "limit": 10
  }
}
```

### 배송 가능 날짜 조회

```
GET /api/delivery/available-dates
```

**쿼리 파라미터:**

- `month`: 월 (YYYY-MM)

**응답:**

```json
{
  "available_dates": [
    "2023-01-02",
    "2023-01-04",
    "2023-01-06",
    ...
  ]
}
```

## 에러 처리

API는 다음과 같은 HTTP 상태 코드를 사용합니다:

- `200 OK`: 요청 성공
- `201 Created`: 리소스 생성 성공
- `400 Bad Request`: 잘못된 요청
- `401 Unauthorized`: 인증 필요
- `403 Forbidden`: 권한 부족
- `404 Not Found`: 리소스를 찾을 수 없음
- `500 Internal Server Error`: 서버 오류

에러 응답 형식:

```json
{
  "error": "에러 메시지"
}
```

## 모델 스키마

### 사용자 (users)

```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  delivery_count INTEGER DEFAULT 0,
  name TEXT,
  phone_number TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);
```

### 상품 (product)

```sql
CREATE TABLE IF NOT EXISTS product (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  delivery_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 공지사항 (notice)

```sql
CREATE TABLE IF NOT EXISTS notice (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT CHECK(type IN ('normal', 'faq')) NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  question TEXT,
  answer TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 결제 (payments)

```sql
CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  product_id INTEGER NOT NULL,
  count INTEGER NOT NULL,
  amount REAL NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 배송 목록 (delivery_list)

```sql
CREATE TABLE IF NOT EXISTS delivery_list (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'complete', 'cancel')) NOT NULL DEFAULT 'pending',
  date TEXT NOT NULL,
  product_id INTEGER NOT NULL
);
```

### SMS 로그 (sms_logs)

```sql
CREATE TABLE IF NOT EXISTS sms_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 고객의 소리 (inquiries)

```sql
CREATE TABLE IF NOT EXISTS inquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  answer TEXT,
  status TEXT CHECK(status IN ('answered', 'unanswered')) NOT NULL DEFAULT 'unanswered',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  answered_at TIMESTAMP
);
```

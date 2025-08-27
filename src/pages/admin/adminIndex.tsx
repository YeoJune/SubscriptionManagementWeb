// src/pages/admin/adminIndex.tsx
import React, { useState, useEffect } from 'react';
import './adminIndex.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

interface DashboardData {
  totalUsers: number;
  todayDeliveries: number;
  pendingInquiries: number;
  totalProducts: number;
  totalNotices: number;
  totalPayments: number;
  completedPayments: number;
  totalAmount: number;
  totalHeroSlides: number;
}

// 🆕 월별 데이터 인터페이스
interface AvailableMonth {
  value: string;
  label: string;
  year: number;
  month: number;
}

const AdminIndex: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalUsers: 0,
    todayDeliveries: 0,
    pendingInquiries: 0,
    totalProducts: 0,
    totalNotices: 0,
    totalPayments: 0,
    completedPayments: 0,
    totalAmount: 0,
    totalHeroSlides: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 🆕 월별 필터 상태 업데이트
  const [selectedMonth, setSelectedMonth] = useState<string>('current');
  const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      fetchDashboardData();
    }
  }, [isAuthenticated, user, selectedMonth]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 결제 통계 API 파라미터 구성
      let paymentsStatsUrl = '/api/payments/admin/stats';
      if (selectedMonth !== 'all' && selectedMonth !== 'current') {
        // 선택된 월이 실제 년-월 형식일 때
        const [year, month] = selectedMonth.split('-');
        paymentsStatsUrl += `?month=${month}&year=${year}`;
      } else if (selectedMonth === 'current') {
        // 현재 월
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();
        paymentsStatsUrl += `?month=${currentMonth}&year=${currentYear}`;
      }

      // 여러 API 요청을 병렬로 처리
      const [
        usersResponse,
        deliveriesResponse,
        inquiriesResponse,
        productsResponse,
        noticesResponse,
        paymentsStatsResponse,
        heroSlidesResponse,
      ] = await Promise.all([
        axios.get('/api/users?limit=1'),
        axios.get('/api/delivery/today'),
        axios.get('/api/admin/inquiries?status=unanswered&limit=1'),
        axios.get('/api/products?limit=1'),
        axios.get('/api/admin/notices?limit=1'),
        axios.get(paymentsStatsUrl),
        axios.get('/api/hero/admin'),
      ]);

      setDashboardData({
        totalUsers: usersResponse.data.pagination?.total || 0,
        todayDeliveries: deliveriesResponse.data.deliveries?.length || 0,
        pendingInquiries: inquiriesResponse.data.pagination?.total || 0,
        totalProducts: productsResponse.data.pagination?.total || 0,
        totalNotices: noticesResponse.data.pagination?.total || 0,
        totalPayments: paymentsStatsResponse.data.stats?.total_payments || 0,
        completedPayments:
          paymentsStatsResponse.data.stats?.completed_payments || 0,
        totalAmount: paymentsStatsResponse.data.stats?.total_amount || 0,
        totalHeroSlides: heroSlidesResponse.data.slides?.length || 0,
      });

      // 🆕 사용 가능한 월 데이터 설정
      if (paymentsStatsResponse.data.available_months) {
        setAvailableMonths(paymentsStatsResponse.data.available_months);
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('대시보드 데이터를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleCardClick = (path: string) => {
    navigate(path);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      notation: 'compact',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // 🆕 월별 선택 옵션 레이블 생성 함수
  const getMonthLabel = () => {
    if (selectedMonth === 'all') {
      return '총 결제액';
    } else if (selectedMonth === 'current') {
      const now = new Date();
      return `${now.getFullYear()}년 ${now.getMonth() + 1}월 결제액`;
    } else {
      const [year, month] = selectedMonth.split('-');
      return `${year}년 ${parseInt(month)}월 결제액`;
    }
  };

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="admin-dashboard-container">
        <div className="alert alert-error">접근 권한이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-container">
      <h1 className="admin-title">관리자 대시보드</h1>

      {/* 🆕 월별 필터 업데이트 */}
      <div className="month-filter-container">
        <div className="month-filter">
          <label htmlFor="month-select">통계 기간:</label>
          <select
            id="month-select"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          >
            <option value="all">전체 기간</option>
            <option value="current">이번 달</option>
            {availableMonths.map((monthData) => (
              <option key={monthData.value} value={monthData.value}>
                {monthData.year}년 {monthData.month}월
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">데이터를 불러오는 중...</div>
        </div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : (
        <>
          {/* 요약 데이터 카드 */}
          <div
            className="summary-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '1rem',
              marginBottom: '3rem',
            }}
          >
            <div className="summary-card users-card">
              <div className="summary-title">전체 사용자</div>
              <div className="summary-value users-value">
                {dashboardData.totalUsers}
                <svg
                  className="users-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
            </div>

            <div className="summary-card delivery-card">
              <div className="summary-title">당일 배송</div>
              <div className="summary-value delivery-value">
                {dashboardData.todayDeliveries}
                <svg
                  className="delivery-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                </svg>
              </div>
            </div>

            <div className="summary-card inquiry-card">
              <div className="summary-title">미해결 문의</div>
              <div className="summary-value inquiry-value">
                {dashboardData.pendingInquiries}
                <svg
                  className="inquiry-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z" />
                </svg>
              </div>
            </div>

            <div className="summary-card products-card">
              <div className="summary-title">전체 상품</div>
              <div className="summary-value products-value">
                {dashboardData.totalProducts}
                <svg
                  className="products-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 5h-3v5.5c0 1.38-1.12 2.5-2.5 2.5S9 14.88 9 13.5 10.12 11 11.5 11c.57 0 1.08.19 1.5.51V6h4v2z" />
                </svg>
              </div>
            </div>

            <div className="summary-card notices-card">
              <div className="summary-title">전체 공지사항</div>
              <div className="summary-value notices-value">
                {dashboardData.totalNotices}
                <svg
                  className="notices-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z" />
                </svg>
              </div>
            </div>

            <div className="summary-card hero-card">
              <div className="summary-title">히어로 슬라이드</div>
              <div className="summary-value hero-value">
                {dashboardData.totalHeroSlides}
                <svg
                  className="hero-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-10-7l2.5 3.01L17 11l4 5H3l4-5z" />
                </svg>
              </div>
            </div>

            {/* 🆕 결제 통계 카드 업데이트 */}
            <div className="summary-card payments-card">
              <div className="summary-title">{getMonthLabel()}</div>
              <div className="summary-value payments-value">
                {formatCurrency(dashboardData.totalAmount)}
                <svg
                  className="payments-icon"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 기능 카드 (기존 코드 동일) */}
          <h2 className="section-title">관리 기능</h2>
          <div
            className="feature-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '1rem',
            }}
          >
            <div className="feature-card delivery-feature">
              <div
                className="feature-card-action"
                onClick={() => handleCardClick('/admin/delivery')}
              >
                <div className="feature-content">
                  <svg
                    className="feature-icon"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                  </svg>
                  <div className="feature-title">배송 관리</div>
                </div>
              </div>
            </div>

            <div className="feature-card users-feature">
              <div
                className="feature-card-action"
                onClick={() => handleCardClick('/admin/users')}
              >
                <div className="feature-content">
                  <svg
                    className="feature-icon"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                  <div className="feature-title">사용자 관리</div>
                </div>
              </div>
            </div>

            <div className="feature-card products-feature">
              <div
                className="feature-card-action"
                onClick={() => handleCardClick('/admin/products')}
              >
                <div className="feature-content">
                  <svg
                    className="feature-icon"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 5h-3v5.5c0 1.38-1.12 2.5-2.5 2.5S9 14.88 9 13.5 10.12 11 11.5 11c.57 0 1.08.19 1.5.51V6h4v2z" />
                  </svg>
                  <div className="feature-title">상품 관리</div>
                </div>
              </div>
            </div>

            <div className="feature-card inquiry-feature">
              <div
                className="feature-card-action"
                onClick={() => handleCardClick('/admin/inquiry')}
              >
                <div className="feature-content">
                  <svg
                    className="feature-icon"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z" />
                  </svg>
                  <div className="feature-title">고객의 소리</div>
                </div>
              </div>
            </div>

            <div className="feature-card notices-feature">
              <div
                className="feature-card-action"
                onClick={() => handleCardClick('/admin/notices')}
              >
                <div className="feature-content">
                  <svg
                    className="feature-icon"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z" />
                  </svg>
                  <div className="feature-title">공지사항 관리</div>
                </div>
              </div>
            </div>

            <div className="feature-card hero-feature">
              <div
                className="feature-card-action"
                onClick={() => handleCardClick('/admin/hero')}
              >
                <div className="feature-content">
                  <svg
                    className="feature-icon"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-10-7l2.5 3.01L17 11l4 5H3l4-5z" />
                  </svg>
                  <div className="feature-title">히어로 관리</div>
                </div>
              </div>
            </div>

            <div className="feature-card payments-feature">
              <div
                className="feature-card-action"
                onClick={() => handleCardClick('/admin/payments')}
              >
                <div className="feature-content">
                  <svg
                    className="feature-icon"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                  </svg>
                  <div className="feature-title">결제 관리</div>
                </div>
              </div>
            </div>

            <div className="feature-card catering-feature">
              <div
                className="feature-card-action"
                onClick={() => handleCardClick('/admin/catering')}
              >
                <div className="feature-content">
                  <svg
                    className="feature-icon"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                  </svg>
                  <div className="feature-title">
                    단체주문/케이터링 문의 관리
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminIndex;

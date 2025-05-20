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
  totalNotices: number; // 공지사항 수 추가
}

const AdminIndex: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalUsers: 0,
    todayDeliveries: 0,
    pendingInquiries: 0,
    totalProducts: 0,
    totalNotices: 0, // 공지사항 수 초기화
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      fetchDashboardData();
    }
  }, [isAuthenticated, user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 여러 API 요청을 병렬로 처리 (공지사항 추가)
      const [
        usersResponse,
        deliveriesResponse,
        inquiriesResponse,
        productsResponse,
        noticesResponse, // 공지사항 API 추가
      ] = await Promise.all([
        axios.get('/api/users?limit=1'),
        axios.get('/api/delivery/today'),
        axios.get('/api/inquiries?status=unanswered&limit=1'),
        axios.get('/api/products?limit=1'),
        axios.get('/api/notices?limit=1'), // 공지사항 API 호출
      ]);

      setDashboardData({
        totalUsers: usersResponse.data.pagination.total || 0,
        todayDeliveries: deliveriesResponse.data.deliveries.length || 0,
        pendingInquiries: inquiriesResponse.data.pagination.total || 0,
        totalProducts: productsResponse.data.pagination.total || 0,
        totalNotices: noticesResponse.data.pagination.total || 0, // 공지사항 수 설정
      });

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
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
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

            {/* 공지사항 카드 추가 */}
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
          </div>

          {/* 기능 카드 */}
          <h2 className="section-title">관리 기능</h2>
          <div
            className="feature-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
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
            {/* 공지사항 관리 카드 추가 */}
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
          </div>
        </>
      )}
    </div>
  );
};

export default AdminIndex;

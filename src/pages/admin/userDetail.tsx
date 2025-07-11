// src/pages/admin/userDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './userDetail.css';

interface ProductDelivery {
  product_id: number;
  product_name: string;
  remaining_count: number;
  total_count: number;
}

interface Delivery {
  id: number;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
  product_name: string;
}

interface UserDetail {
  id: number;
  phone_number: string;
  product_delivery: ProductDelivery[];
  isAdmin: boolean;
  created_at: string;
  deliveries: Delivery[];
}

const AdminUserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      navigate('/admin/users');
      return;
    }

    if (id) {
      fetchUserDetail(id);
    }
  }, [id, isAuthenticated, user, navigate]);

  const fetchUserDetail = async (userId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '사용자 정보를 불러오지 못했습니다.');
      }

      const data = await response.json();
      setUserDetail(data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { text: '대기중', class: 'status-pending' },
      completed: { text: '완료', class: 'status-completed' },
      cancelled: { text: '취소', class: 'status-cancelled' },
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || {
      text: status,
      class: '',
    };
    return (
      <span className={`status-badge ${statusInfo.class}`}>
        {statusInfo.text}
      </span>
    );
  };

  const getTotalDeliveryCount = () => {
    if (!userDetail?.product_delivery) return 0;
    return userDetail.product_delivery.reduce(
      (total, product) => total + product.remaining_count,
      0
    );
  };

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="user-detail-container">
        <div className="alert alert-error">접근 권한이 없습니다.</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="user-detail-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div>사용자 정보를 불러오는 중...</div>
        </div>
      </div>
    );
  }

  if (error || !userDetail) {
    return (
      <div className="user-detail-container">
        <div className="alert alert-error">
          {error || '사용자를 찾을 수 없습니다.'}
        </div>
        <button
          className="back-button"
          onClick={() => navigate('/admin/users')}
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="user-detail-container">
      <div className="header-section">
        <button
          className="back-button"
          onClick={() => navigate('/admin/users')}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path
              d="M19 12H5M5 12L12 19M5 12L12 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          목록으로 돌아가기
        </button>
        <h1 className="page-title">사용자 상세 정보</h1>
      </div>

      <div className="content-grid">
        {/* 기본 정보 */}
        <div className="info-card">
          <h2 className="card-title">기본 정보</h2>
          <div className="info-item">
            <label>사용자 ID:</label>
            <span>{userDetail.id}</span>
          </div>
          <div className="info-item">
            <label>전화번호:</label>
            <span>{userDetail.phone_number}</span>
          </div>
          <div className="info-item">
            <label>가입일:</label>
            <span>{new Date(userDetail.created_at).toLocaleDateString()}</span>
          </div>
          <div className="info-item">
            <label>권한:</label>
            <span>
              {userDetail.isAdmin ? (
                <span className="admin-badge">관리자</span>
              ) : (
                '일반 회원'
              )}
            </span>
          </div>
          <div className="info-item">
            <label>총 잔여 배송 횟수:</label>
            <span className="delivery-count-total">
              {getTotalDeliveryCount()}회
            </span>
          </div>
        </div>

        {/* 상품별 배송 정보 */}
        <div className="info-card">
          <h2 className="card-title">상품별 배송 정보</h2>
          {userDetail.product_delivery &&
          userDetail.product_delivery.length > 0 ? (
            <div className="product-delivery-list">
              {userDetail.product_delivery.map((product) => (
                <div key={product.product_id} className="product-delivery-item">
                  <div className="product-info">
                    <h3 className="product-name">{product.product_name}</h3>
                    <div className="delivery-progress">
                      <span className="remaining">
                        잔여: {product.remaining_count}회
                      </span>
                      <span className="total">
                        / 총 {product.total_count}회
                      </span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${((product.total_count - product.remaining_count) / product.total_count) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="no-data">등록된 상품이 없습니다.</p>
          )}
        </div>

        {/* 배송 이력 */}
        <div className="info-card full-width">
          <h2 className="card-title">배송 이력</h2>
          {userDetail.deliveries && userDetail.deliveries.length > 0 ? (
            <div className="deliveries-table-container">
              <table className="deliveries-table">
                <thead>
                  <tr>
                    <th>배송 ID</th>
                    <th>상품명</th>
                    <th>배송일</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {userDetail.deliveries.map((delivery) => (
                    <tr key={delivery.id}>
                      <td>{delivery.id}</td>
                      <td>{delivery.product_name}</td>
                      <td>{new Date(delivery.date).toLocaleDateString()}</td>
                      <td>{getStatusBadge(delivery.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="no-data">배송 이력이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminUserDetail;

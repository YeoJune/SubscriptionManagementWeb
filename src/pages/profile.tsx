// src/pages/profile.tsx
import React, { useState, useEffect } from 'react';
import './profile.css';
import { useAuth } from '../hooks/useAuth';
import UserCard from '../components/userCard';
import axios from 'axios';
import { DeliveryProps } from '../types';

const Profile: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  console.log(user);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDeliveries();
    }
  }, [isAuthenticated]);

  const fetchDeliveries = async () => {
    try {
      const response = await axios.get('/api/delivery/my');
      setDeliveries(response.data.deliveries || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch deliveries:', err);
      setError('배송 정보를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  // 배송 상태별 클래스명 및 라벨
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { className: 'status-pending', label: '배송 대기' };
      case 'complete':
        return { className: 'status-complete', label: '배송 완료' };
      case 'cancel':
        return { className: 'status-cancel', label: '배송 취소' };
      default:
        return { className: '', label: status };
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="profile-container">
        <div className="alert alert-warning">로그인 후 접근 가능합니다.</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <h1 className="profile-title">내 프로필</h1>

      <div className="profile-grid">
        <div>
          <UserCard user={user} />
        </div>

        <div className="profile-card">
          <div className="profile-card-content">
            <h3 className="delivery-info-title">배송 잔여 횟수</h3>
            {user.product_delivery && user.product_delivery.length > 0 ? (
              <div className="product-delivery-list">
                {user.product_delivery.map((product) => (
                  <div key={product.product_id} className="delivery-count">
                    <span>{product.product_name}:</span>
                    <span className="delivery-count-number">
                      {product.remaining_count}회
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="delivery-count">
                <span>구독 중인 상품이 없습니다</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <hr className="divider" />

      <h2 className="delivery-history-title">배송 내역</h2>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : deliveries.length === 0 ? (
        <div className="alert alert-info">배송 내역이 없습니다.</div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>배송일</th>
                <th>상품</th>
                <th style={{ textAlign: 'center' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((delivery) => {
                const statusInfo = getStatusInfo(delivery.status);
                return (
                  <tr key={delivery.id}>
                    <td>{new Date(delivery.date).toLocaleDateString()}</td>
                    <td>{delivery.product_name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-chip ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Profile;

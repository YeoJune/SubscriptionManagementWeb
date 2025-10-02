// src/pages/profile.tsx
import React, { useState, useEffect } from 'react';
import './profile.css';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import { DeliveryProps } from '../types';

interface PaymentProps {
  id: number;
  order_id: string;
  product_name: string;
  amount: number;
  status: string;
  depositor_name?: string;
  created_at: string;
  paid_at?: string;
}

const Profile: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryProps[]>([]);
  const [payments, setPayments] = useState<PaymentProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [paymentLoading, setPaymentLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    phone_number: string;
    email: string;
    address: string;
  }>({
    name: '',
    phone_number: '',
    email: '',
    address: '',
  });

  console.log(user);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDeliveries();
      fetchPayments();
      // 편집 폼 초기화
      if (user) {
        setEditForm({
          name: user.name || '',
          phone_number: user.phone_number || '',
          email: user.email || '',
          address: user.address || '',
        });
      }
    }
  }, [isAuthenticated, user]);

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

  const fetchPayments = async () => {
    setPaymentLoading(true);
    try {
      const response = await axios.get('/api/payments?limit=10');
      setPayments(response.data.payments || []);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user) return;

    try {
      // ID에 스페이스나 특수문자가 있을 수 있으므로 URL 인코딩
      const response = await fetch(
        `/api/users/${encodeURIComponent(user.id)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(editForm),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '프로필 업데이트에 실패했습니다.');
      }

      // 업데이트 성공 후 페이지 새로고침 또는 상태 업데이트
      window.location.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditToggle = () => {
    if (isEditing && user) {
      // 취소 시 원래 값으로 되돌리기
      setEditForm({
        name: user.name || '',
        phone_number: user.phone_number || '',
        email: user.email || '',
        address: user.address || '',
      });
    }
    setIsEditing(!isEditing);
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

  // 결제 상태별 클래스명 및 라벨
  const getPaymentStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { className: 'status-complete', label: '결제완료' };
      case 'cash_pending':
        return { className: 'status-pending', label: '입금대기' };
      case 'pending':
        return { className: 'status-pending', label: '결제대기' };
      case 'failed':
        return { className: 'status-cancel', label: '결제실패' };
      case 'cancelled':
        return { className: 'status-cancel', label: '결제취소' };
      case 'authenticated':
        return { className: 'status-pending', label: '인증완료' };
      default:
        return { className: '', label: status };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR').format(amount) + '원';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
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
      <div className="profile-header">
        <h1 className="profile-title">내 프로필</h1>
        <div className="profile-actions">
          {isEditing ? (
            <>
              <button className="save-button" onClick={handleUpdateProfile}>
                저장
              </button>
              <button className="cancel-button" onClick={handleEditToggle}>
                취소
              </button>
            </>
          ) : (
            <button className="edit-button" onClick={handleEditToggle}>
              수정
            </button>
          )}
        </div>
      </div>

      <div className="profile-grid">
        <div className="profile-card">
          <div className="profile-card-content">
            <h3 className="profile-card-title">개인 정보</h3>
            <div className="profile-info">
              <div className="info-item">
                <label>사용자 ID:</label>
                <span>{user.id}</span>
              </div>
              <div className="info-item">
                <label>이름:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({ ...editForm, name: e.target.value })
                    }
                    className="edit-input"
                    placeholder="이름을 입력하세요"
                  />
                ) : (
                  <span>{user.name || '-'}</span>
                )}
              </div>
              <div className="info-item">
                <label>전화번호:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editForm.phone_number}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        phone_number: e.target.value,
                      })
                    }
                    className="edit-input"
                    placeholder="전화번호를 입력하세요"
                  />
                ) : (
                  <span>{user.phone_number}</span>
                )}
              </div>
              <div className="info-item">
                <label>이메일:</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    className="edit-input"
                    placeholder="이메일을 입력하세요"
                  />
                ) : (
                  <span>{user.email || '-'}</span>
                )}
              </div>
              <div className="info-item">
                <label>주소:</label>
                {isEditing ? (
                  <textarea
                    value={editForm.address}
                    onChange={(e) =>
                      setEditForm({ ...editForm, address: e.target.value })
                    }
                    className="edit-textarea"
                    placeholder="주소를 입력하세요"
                    rows={2}
                  />
                ) : (
                  <span>{user.address || '-'}</span>
                )}
              </div>
            </div>
          </div>
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

      {/* 결제 내역 섹션 */}
      <h2 className="payment-history-title">최근 결제 내역</h2>

      {paymentLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      ) : payments.length === 0 ? (
        <div className="alert alert-info">결제 내역이 없습니다.</div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>주문번호</th>
                <th>상품명</th>
                <th>금액</th>
                <th style={{ textAlign: 'center' }}>상태</th>
                <th>주문일</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const statusInfo = getPaymentStatusInfo(payment.status);
                return (
                  <tr key={payment.id}>
                    <td>
                      <div className="order-id-cell">
                        <span className="order-id">{payment.order_id}</span>
                        {payment.depositor_name && (
                          <div className="depositor-info">
                            입금자: {payment.depositor_name}
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{payment.product_name}</td>
                    <td>
                      <strong>{formatCurrency(payment.amount)}</strong>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`status-chip ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                      {payment.status === 'cash_pending' && (
                        <div className="cash-pending-notice">
                          관리자 승인 대기 중
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="date-cell">
                        {formatDate(payment.created_at)}
                        {payment.paid_at && payment.status === 'completed' && (
                          <div className="paid-date">
                            결제: {formatDate(payment.paid_at)}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <hr className="divider" />

      {/* 배송 내역 섹션 */}
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
                    <td>{formatDate(delivery.date)}</td>
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

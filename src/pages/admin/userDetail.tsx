// src/pages/admin/userDetail.tsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import './userDetail.css';

interface ProductDelivery {
  product_id: number;
  product_name: string;
  remaining_count: number;
}

interface Delivery {
  id: number;
  date: string;
  status: 'pending' | 'complete' | 'cancel';
  product_name: string;
  user_name?: string;
  phone_number?: string;
  address?: string;
}

interface UserDetail {
  id: string;
  name?: string;
  phone_number: string;
  email?: string;
  address?: string;
  total_delivery_count: number;
  card_payment_allowed: boolean;
  product_deliveries: ProductDelivery[];
  created_at: string;
  last_login?: string;
}

interface DeliveryResponse {
  deliveries: Delivery[];
  pagination: {
    total: number;
    currentPage: number;
    totalPages: number;
    limit: number;
  };
}

const AdminUserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [userDetail, setUserDetail] = useState<UserDetail | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deliveryLoading, setDeliveryLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    phone_number: string;
    email: string;
    address: string;
    card_payment_allowed: boolean;
  }>({
    name: '',
    phone_number: '',
    email: '',
    address: '',
    card_payment_allowed: false,
  });

  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin) {
      navigate('/admin/users');
      return;
    }

    if (id) {
      fetchUserDetail(id);
      fetchUserDeliveries(id);
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
      setUserDetail(data);
      // 편집 폼 초기화
      setEditForm({
        name: data.name || '',
        phone_number: data.phone_number || '',
        email: data.email || '',
        address: data.address || '',
        card_payment_allowed: !!data.card_payment_allowed,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDeliveries = async (userId: string) => {
    setDeliveryLoading(true);
    try {
      // 관리자용 배송 목록 API 사용 (사용자 ID로 검색)
      const response = await fetch(`/api/delivery?search=${userId}&limit=50`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        console.error('배송 이력을 불러오는데 실패했습니다.');
        return;
      }

      const data: DeliveryResponse = await response.json();
      setDeliveries(data.deliveries || []);
    } catch (err: any) {
      console.error('배송 이력 로드 오류:', err);
    } finally {
      setDeliveryLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!id) return;

    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(editForm),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '사용자 정보 업데이트에 실패했습니다.');
      }

      // 업데이트 성공 후 다시 조회
      await fetchUserDetail(id);
      setIsEditing(false);
      alert('사용자 정보가 성공적으로 업데이트되었습니다.');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // 취소 시 원래 값으로 되돌리기
      if (userDetail) {
        setEditForm({
          name: userDetail.name || '',
          phone_number: userDetail.phone_number || '',
          email: userDetail.email || '',
          address: userDetail.address || '',
          card_payment_allowed: !!userDetail.card_payment_allowed,
        });
      }
    }
    setIsEditing(!isEditing);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { text: '대기중', class: 'status-pending' },
      complete: { text: '완료', class: 'status-completed' },
      cancel: { text: '취소', class: 'status-cancelled' },
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
        <div className="action-buttons">
          {isEditing ? (
            <>
              <button className="save-button" onClick={handleUpdateUser}>
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

      <div className="content-grid">
        {/* 기본 정보 */}
        <div className="info-card">
          <h2 className="card-title">기본 정보</h2>
          <div className="info-item">
            <label>사용자 ID:</label>
            <span>{userDetail.id}</span>
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
              />
            ) : (
              <span>{userDetail.name || '-'}</span>
            )}
          </div>
          <div className="info-item">
            <label>전화번호:</label>
            {isEditing ? (
              <input
                type="text"
                value={editForm.phone_number}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone_number: e.target.value })
                }
                className="edit-input"
              />
            ) : (
              <span>{userDetail.phone_number}</span>
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
              />
            ) : (
              <span>{userDetail.email || '-'}</span>
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
                rows={2}
              />
            ) : (
              <span>{userDetail.address || '-'}</span>
            )}
          </div>
          <div className="info-item">
            <label>카드 결제 허용:</label>
            {isEditing ? (
              <label className="card-payment-checkbox">
                <input
                  type="checkbox"
                  checked={editForm.card_payment_allowed}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      card_payment_allowed: e.target.checked,
                    })
                  }
                />
                <span className="checkbox-label">
                  {editForm.card_payment_allowed ? '허용' : '차단'}
                </span>
              </label>
            ) : (
              <span
                className={`card-payment-status ${userDetail.card_payment_allowed ? 'allowed' : 'blocked'}`}
              >
                {userDetail.card_payment_allowed ? '✅ 허용' : '❌ 차단'}
              </span>
            )}
          </div>
          <div className="info-item">
            <label>가입일:</label>
            <span>{new Date(userDetail.created_at).toLocaleDateString()}</span>
          </div>
          {userDetail.last_login && (
            <div className="info-item">
              <label>최근 로그인:</label>
              <span>
                {new Date(userDetail.last_login).toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="info-item">
            <label>총 잔여 배송 횟수:</label>
            <span className="delivery-count-total">
              {userDetail.total_delivery_count}회
            </span>
          </div>
        </div>

        {/* 상품별 배송 정보 */}
        <div className="info-card">
          <h2 className="card-title">상품별 배송 정보</h2>
          {userDetail.product_deliveries &&
          userDetail.product_deliveries.length > 0 ? (
            <div className="product-delivery-list">
              {userDetail.product_deliveries.map((product) => (
                <div key={product.product_id} className="product-delivery-item">
                  <div className="product-info">
                    <h3 className="product-name">{product.product_name}</h3>
                    <div className="delivery-progress">
                      <span className="remaining">
                        잔여: {product.remaining_count}회
                      </span>
                    </div>
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
          <h2 className="card-title">
            배송 이력
            {deliveryLoading && (
              <span className="loading-text"> (로딩 중...)</span>
            )}
          </h2>
          {deliveries && deliveries.length > 0 ? (
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
                  {deliveries.map((delivery) => (
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
          ) : deliveryLoading ? (
            <div className="loading-container-small">
              <div className="loading-spinner-small"></div>
              <p>배송 이력을 불러오는 중...</p>
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

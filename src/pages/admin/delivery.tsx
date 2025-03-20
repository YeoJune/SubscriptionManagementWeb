// src/pages/admin/delivery.tsx
import React, { useEffect, useState } from 'react';
import './Delivery.css';

interface Delivery {
  id: number;
  user_id: string;
  status: string;
  date: string;
  product_id: number;
  product_name: string;
  phone_number: string;
}

const Delivery: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // 당일 배송 목록 조회 (관리자 전용)
  const fetchTodayDeliveries = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/delivery/today');
      if (!response.ok) {
        throw new Error('오늘 배송 목록 조회에 실패했습니다.');
      }
      const data = await response.json();
      setDeliveries(data.deliveries);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 배송 상태 변경 (관리자 전용)
  const updateDeliveryStatus = async (id: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/delivery/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        throw new Error('배송 상태 변경에 실패했습니다.');
      }
      const data = await response.json();
      // 상태 변경 후 로컬 상태 업데이트
      setDeliveries((prev) =>
        prev.map((delivery) =>
          delivery.id === id
            ? { ...delivery, status: data.delivery.status }
            : delivery
        )
      );
    } catch (err) {
      alert((err as Error).message);
    }
  };

  useEffect(() => {
    fetchTodayDeliveries();
  }, []);

  return (
    <div className="delivery-container">
      <h1>오늘 배송 목록 (관리자 전용)</h1>
      {loading && <div className="loading">로딩중...</div>}
      {error && <div className="error">오류: {error}</div>}
      {!loading && !error && (
        <>
          {deliveries.length === 0 ? (
            <p>오늘 배송 내역이 없습니다.</p>
          ) : (
            <table className="delivery-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>사용자 ID</th>
                  <th>상태</th>
                  <th>날짜</th>
                  <th>상품 ID</th>
                  <th>상품명</th>
                  <th>전화번호</th>
                  <th>액션</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => (
                  <tr key={delivery.id}>
                    <td>{delivery.id}</td>
                    <td>{delivery.user_id}</td>
                    <td>{delivery.status}</td>
                    <td>{delivery.date}</td>
                    <td>{delivery.product_id}</td>
                    <td>{delivery.product_name}</td>
                    <td>{delivery.phone_number}</td>
                    <td>
                      {delivery.status !== 'complete' && (
                        <button
                          className="btn-update"
                          onClick={() =>
                            updateDeliveryStatus(delivery.id, 'complete')
                          }
                        >
                          완료로 변경
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
};

export default Delivery;

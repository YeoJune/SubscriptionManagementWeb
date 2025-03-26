// src/components/shippingInfo.tsx
import React, { useState, useEffect } from 'react';
import './shippingInfo.css';
import './pagination.css';
import axios from 'axios';
import { DeliveryProps } from '../types';

interface PaginationData {
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
}

const ShippingInfo: React.FC = () => {
  const [deliveries, setDeliveries] = useState<DeliveryProps[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    fetchMyDeliveries();
  }, [page]);

  const fetchMyDeliveries = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/delivery/my', {
        params: { page, limit: 10 },
      });

      setDeliveries(response.data.deliveries);
      setPagination(response.data.pagination);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch deliveries:', err);
      setError('배송 내역을 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handlePageChange = (value: number) => {
    setPage(value);
  };

  // 배송 상태별 색상 및 라벨
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { class: 'status-warning', label: '배송 대기' };
      case 'complete':
        return { class: 'status-success', label: '배송 완료' };
      case 'cancel':
        return { class: 'status-error', label: '배송 취소' };
      default:
        return { class: '', label: status };
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="progress-indicator">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  return (
    <div className="shipping-container">
      <h2 className="shipping-title">배송 내역</h2>

      {deliveries.length === 0 ? (
        <div className="alert alert-info">배송 내역이 없습니다.</div>
      ) : (
        <>
          <div className="table-container">
            <table className="table">
              <thead className="table-head">
                <tr>
                  <th className="table-head-cell">배송일</th>
                  <th className="table-head-cell">상품명</th>
                  <th
                    className="table-head-cell"
                    style={{ textAlign: 'center' }}
                  >
                    상태
                  </th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map((delivery) => {
                  const statusInfo = getStatusInfo(delivery.status);
                  return (
                    <tr key={delivery.id} className="table-row">
                      <td className="table-cell">
                        {new Date(delivery.date).toLocaleDateString()}
                      </td>
                      <td className="table-cell">{delivery.product_name}</td>
                      <td
                        className="table-cell"
                        style={{ textAlign: 'center' }}
                      >
                        <span className={`status-chip ${statusInfo.class}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="pagination-container">
              <ul className="pagination">
                {Array.from(
                  { length: pagination.totalPages },
                  (_, i) => i + 1
                ).map((num) => (
                  <li
                    key={num}
                    className={`pagination-item ${page === num ? 'pagination-selected' : ''}`}
                    onClick={() => handlePageChange(num)}
                  >
                    {num}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ShippingInfo;

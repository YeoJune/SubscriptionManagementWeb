// src/pages/admin/delivery.tsx
import React, { useEffect, useState } from 'react';
import './delivery.css';
import { useAuth } from '../../hooks/useAuth';
import { DeliveryProps } from '../../types';
import axios from 'axios';

const Delivery: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDelivery, setSelectedDelivery] =
    useState<DeliveryProps | null>(null);
  const [statusToUpdate, setStatusToUpdate] = useState<'complete' | 'cancel'>(
    'complete'
  );

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      fetchDeliveries();
    }
  }, [page, rowsPerPage, filterStatus, filterDate]);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
      };

      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (filterDate) {
        params.date = filterDate;
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await axios.get('/api/delivery', { params });

      setDeliveries(response.data.deliveries);
      setTotal(response.data.pagination?.total || 0);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch deliveries:', err);
      setError('배송 목록을 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    fetchDeliveries();
  };

  const handleOpenStatusDialog = (
    delivery: DeliveryProps,
    status: 'complete' | 'cancel'
  ) => {
    setSelectedDelivery(delivery);
    setStatusToUpdate(status);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDelivery(null);
  };

  const handleUpdateStatus = async () => {
    if (!selectedDelivery) return;

    try {
      await axios.put(`/api/delivery/${selectedDelivery.id}`, {
        status: statusToUpdate,
      });

      handleCloseDialog();
      fetchDeliveries();
    } catch (err) {
      console.error('Failed to update delivery status:', err);
      setError('배송 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // 배송 상태별 색상 및 라벨
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { className: 'status-warning', label: '배송 대기' };
      case 'complete':
        return { className: 'status-success', label: '배송 완료' };
      case 'cancel':
        return { className: 'status-error', label: '배송 취소' };
      default:
        return { className: '', label: status };
    }
  };

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="admin-container">
        <div className="alert alert-error">접근 권한이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <h1 className="admin-title">배송 관리</h1>

      {/* 필터 및 검색 */}
      <div className="filter-paper">
        <div className="filter-grid">
          <div className="form-control">
            <label htmlFor="status-filter">배송 상태</label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">전체</option>
              <option value="pending">배송 대기</option>
              <option value="complete">배송 완료</option>
              <option value="cancel">배송 취소</option>
            </select>
          </div>

          <div className="form-control">
            <label htmlFor="date-filter">배송일 (YYYY-MM-DD)</label>
            <input
              id="date-filter"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          <div className="form-control">
            <label htmlFor="search-term">검색</label>
            <input
              id="search-term"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="이름, 주소 또는 연락처 검색"
            />
          </div>

          <div className="form-control">
            <label htmlFor="search-button">&nbsp;</label>
            <button
              id="search-button"
              className="filter-button"
              onClick={handleSearch}
            >
              검색
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div>데이터를 불러오는 중...</div>
        </div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : deliveries.length === 0 ? (
        <div className="alert alert-info">배송 내역이 없습니다.</div>
      ) : (
        <>
          <div className="table-container">
            <table className="admin-table">
              <thead className="admin-table-head">
                <tr>
                  <th>ID</th>
                  <th>사용자</th>
                  <th>배송일</th>
                  <th>상품</th>
                  <th className="hide-xs">연락처</th>
                  <th className="hide-sm">주소</th>
                  <th style={{ textAlign: 'center' }}>상태</th>
                  <th style={{ textAlign: 'center' }}>잔여</th>
                  <th style={{ textAlign: 'center' }}>액션</th>
                </tr>
              </thead>
              <tbody className="admin-table-body">
                {deliveries.map((delivery) => {
                  const statusInfo = getStatusInfo(delivery.status);
                  return (
                    <tr key={delivery.id}>
                      <td>{delivery.id}</td>
                      <td>{delivery.user_name || delivery.user_id}</td>
                      <td>{new Date(delivery.date).toLocaleDateString()}</td>
                      <td>{delivery.product_name}</td>
                      <td className="hide-xs">{delivery.phone_number}</td>
                      <td className="hide-sm">{delivery.address}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-chip ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {delivery.remaining_count_for_product !== undefined ? (
                          <span className="remaining-count-badge">
                            {delivery.remaining_count_for_product}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {delivery.status === 'pending' && (
                          <div>
                            <button
                              className="action-button success-button"
                              onClick={() =>
                                handleOpenStatusDialog(delivery, 'complete')
                              }
                            >
                              완료
                            </button>
                            <button
                              className="action-button error-button"
                              onClick={() =>
                                handleOpenStatusDialog(delivery, 'cancel')
                              }
                            >
                              취소
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination-container">
            <div className="rows-per-page">
              <span>페이지당 행 수:</span>
              <select value={rowsPerPage} onChange={handleChangeRowsPerPage}>
                {[10, 25, 50].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>

            <div className="pagination-info">
              {page * rowsPerPage + 1}-
              {Math.min((page + 1) * rowsPerPage, total)} / 전체 {total}
            </div>

            <div className="pagination-controls">
              <button
                className="pagination-button"
                onClick={() => handleChangePage(page - 1)}
                disabled={page === 0}
              >
                이전
              </button>
              <button
                className="pagination-button"
                onClick={() => handleChangePage(page + 1)}
                disabled={(page + 1) * rowsPerPage >= total}
              >
                다음
              </button>
            </div>
          </div>
        </>
      )}

      {/* 상태 변경 확인 다이얼로그 */}
      {openDialog && selectedDelivery && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h2 className="modal-title">배송 상태 변경 확인</h2>
            <div className="modal-body">
              <p>
                ID: {selectedDelivery.id}, 사용자:{' '}
                {selectedDelivery.user_name || selectedDelivery.user_id}의 배송
                상태를
                <strong>
                  {' '}
                  {statusToUpdate === 'complete' ? '완료' : '취소'}
                </strong>
                로 변경하시겠습니까?
              </p>
            </div>
            <div className="modal-actions">
              <button className="cancel-button" onClick={handleCloseDialog}>
                취소
              </button>
              <button
                className={`confirm-button ${statusToUpdate === 'complete' ? 'confirm-success' : 'confirm-error'}`}
                onClick={handleUpdateStatus}
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Delivery;

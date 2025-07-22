// src/pages/admin/payments.tsx
import React, { useEffect, useState } from 'react';
// 현금 결제 입력 모달 컴포넌트
const CashPaymentModal = ({ open, onClose, onSubmit }: any) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString('sv-SE')
  );
  const [customerName, setCustomerName] = useState('');
  const [memo, setMemo] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !date) return;
    onSubmit({
      amount: Number(amount),
      date,
      customerName,
      memo,
    });
  };

  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>현금 결제 추가</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-control">
            <label>결제일</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div className="form-control">
            <label>금액</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="1"
            />
          </div>
          <div className="form-control">
            <label>고객명(선택)</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div className="form-control">
            <label>비고</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button type="submit" className="primary">
              추가
            </button>
            <button type="button" onClick={onClose}>
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
import './payments.css';
import { useAuth } from '../../hooks/useAuth';
import axios from 'axios';

interface PaymentProps {
  id: number;
  user_id: string;
  user_name?: string;
  user_phone?: string;
  product_id: number;
  product_name: string;
  count: number;
  amount: number;
  order_id: string;
  status: string;
  payment_method?: string;
  payment_gateway_transaction_id?: string;
  paid_at?: string;
  created_at: string;
}

interface PaginationInfo {
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
}

const AdminPayments: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [payments, setPayments] = useState<PaymentProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    currentPage: 1,
    totalPages: 0,
    limit: 10,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  // 월별 필터 추가 (YYYY-MM)
  const [filterMonth, setFilterMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  // 현금 결제 모달 상태
  const [openCashModal, setOpenCashModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      fetchPayments();
    }
  }, [page, rowsPerPage, filterStatus, dateFrom, dateTo, filterMonth]);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
      };
      if (filterStatus !== 'all') params.status = filterStatus;
      if (searchTerm) params.search = searchTerm;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (filterMonth) params.month = filterMonth; // 월별 필터 적용
      const response = await axios.get('/api/admin/payments', { params });
      setPayments(response.data.payments || []);
      setPagination(
        response.data.pagination || {
          total: 0,
          currentPage: 1,
          totalPages: 0,
          limit: rowsPerPage,
        }
      );
    } catch (err: any) {
      console.error('Failed to fetch payments:', err);
      setError(
        err.response?.data?.error ||
          '결제 내역을 불러오는 중 오류가 발생했습니다.'
      );
    } finally {
      setLoading(false);
    }
  };
  // 현금 결제 추가 핸들러
  const handleAddCashPayment = async (data: any) => {
    try {
      await axios.post('/api/admin/payments/cash', data);
      setOpenCashModal(false);
      fetchPayments();
    } catch (err) {
      alert('현금 결제 추가에 실패했습니다.');
    }
  };

  const handleSearch = () => {
    setPage(0);
    fetchPayments();
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { className: 'status-success', label: '결제완료' };
      case 'pending':
        return { className: 'status-warning', label: '결제대기' };
      case 'failed':
        return { className: 'status-error', label: '결제실패' };
      case 'cancelled':
        return { className: 'status-error', label: '결제취소' };
      case 'ready':
        return { className: 'status-info', label: '결제준비' };
      case 'vbank_ready':
        return { className: 'status-info', label: '가상계좌대기' };
      case 'vbank_expired':
        return { className: 'status-error', label: '가상계좌만료' };
      default:
        return { className: 'status-default', label: status };
    }
  };

  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
      case 'CARD':
        return '신용카드';
      case 'VBANK':
        return '가상계좌';
      case 'BANK':
        return '계좌이체';
      case 'PHONE':
        return '휴대폰';
      default:
        return method || '-';
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
      <h1 className="admin-title">결제 내역 관리</h1>

      {/* 필터 및 검색 */}
      <div className="filter-paper">
        <div className="filter-grid">
          {/* 월별 필터 */}
          <div className="form-control">
            <label htmlFor="month-filter">월별</label>
            <input
              id="month-filter"
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            />
          </div>
          {/* 현금 결제 추가 버튼 */}
          <div style={{ margin: '1rem 0' }}>
            <button className="primary" onClick={() => setOpenCashModal(true)}>
              현금 결제 추가
            </button>
          </div>
          <CashPaymentModal
            open={openCashModal}
            onClose={() => setOpenCashModal(false)}
            onSubmit={handleAddCashPayment}
          />
          <div className="form-control">
            <label htmlFor="status-filter">결제 상태</label>
            <select
              id="status-filter"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">전체</option>
              <option value="completed">결제완료</option>
              <option value="pending">결제대기</option>
              <option value="failed">결제실패</option>
              <option value="cancelled">결제취소</option>
              <option value="ready">결제준비</option>
              <option value="vbank_ready">가상계좌대기</option>
            </select>
          </div>

          <div className="form-control">
            <label htmlFor="date-from">시작일</label>
            <input
              id="date-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="form-control">
            <label htmlFor="date-to">종료일</label>
            <input
              id="date-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
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
              placeholder="사용자명, 주문번호, 상품명 검색"
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

      {/* 요약 정보 */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-title">전체 결제</div>
          <div className="summary-value">{pagination.total}건</div>
        </div>
        <div className="summary-card">
          <div className="summary-title">완료된 결제</div>
          <div className="summary-value text-success">
            {payments.filter((p) => p.status === 'completed').length}건
          </div>
        </div>
        <div className="summary-card">
          <div className="summary-title">총 결제 금액</div>
          <div className="summary-value text-primary">
            {formatCurrency(
              payments
                .filter((p) => p.status === 'completed')
                .reduce((sum, p) => sum + p.amount, 0)
            )}
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
      ) : payments.length === 0 ? (
        <div className="alert alert-info">결제 내역이 없습니다.</div>
      ) : (
        <>
          <div className="table-container">
            <table className="admin-table">
              <thead className="admin-table-head">
                <tr>
                  <th>결제ID</th>
                  <th>주문번호</th>
                  <th>사용자</th>
                  <th className="hide-xs">연락처</th>
                  <th>상품명</th>
                  <th>금액</th>
                  <th className="hide-sm">결제수단</th>
                  <th style={{ textAlign: 'center' }}>상태</th>
                  <th className="hide-sm">결제일시</th>
                </tr>
              </thead>
              <tbody className="admin-table-body">
                {payments.map((payment) => {
                  const statusInfo = getStatusInfo(payment.status);
                  return (
                    <tr key={payment.id}>
                      <td>{payment.id}</td>
                      <td>
                        <div className="order-id-cell">
                          {payment.order_id}
                          {payment.payment_gateway_transaction_id && (
                            <div className="transaction-id">
                              TID: {payment.payment_gateway_transaction_id}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="user-info-cell">
                          <strong>
                            {payment.user_name || payment.user_id}
                          </strong>
                          <div className="user-id">ID: {payment.user_id}</div>
                        </div>
                      </td>
                      <td className="hide-xs">{payment.user_phone || '-'}</td>
                      <td>
                        <div className="product-info-cell">
                          {payment.product_name}
                          <div className="product-count">
                            수량: {payment.count}
                          </div>
                        </div>
                      </td>
                      <td>
                        <strong className="amount-text">
                          {formatCurrency(payment.amount)}
                        </strong>
                      </td>
                      <td className="hide-sm">
                        {getPaymentMethodLabel(payment.payment_method)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`status-chip ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="hide-sm">
                        {payment.paid_at ? (
                          <div className="date-cell">
                            {formatDate(payment.paid_at)}
                          </div>
                        ) : (
                          <div className="date-cell text-muted">
                            생성: {formatDate(payment.created_at)}
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
                {[10, 25, 50, 100].map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ))}
              </select>
            </div>

            <div className="pagination-info">
              {page * rowsPerPage + 1}-
              {Math.min((page + 1) * rowsPerPage, pagination.total)} / 전체{' '}
              {pagination.total}
            </div>

            <div className="pagination-controls">
              <button
                className="pagination-button"
                onClick={() => handleChangePage(page - 1)}
                disabled={page === 0}
              >
                이전
              </button>
              <span className="page-indicator">
                {page + 1} / {pagination.totalPages}
              </span>
              <button
                className="pagination-button"
                onClick={() => handleChangePage(page + 1)}
                disabled={(page + 1) * rowsPerPage >= pagination.total}
              >
                다음
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminPayments;

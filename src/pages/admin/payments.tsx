// src/pages/admin/payments.tsx
import React, { useEffect, useState } from 'react';
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
  depositor_name?: string;
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

  // 현금 결제 모달 및 폼 상태
  const [showCashModal, setShowCashModal] = useState(false);
  const [cashPaymentForm, setCashPaymentForm] = useState({
    user_id: '',
    product_id: '',
    amount: '',
    payment_memo: '',
  });
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);

  // 🆕 결제 취소 모달 상태
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelPaymentId, setCancelPaymentId] = useState<number | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [processingCancel, setProcessingCancel] = useState(false);

  // 🆕 현금 결제 승인/거절 처리 상태
  const [processingCashAction, setProcessingCashAction] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      fetchPayments();
    }
  }, [page, rowsPerPage, filterStatus, dateFrom, dateTo]);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);

    try {
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
      };

      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      if (dateFrom) {
        params.date_from = dateFrom;
      }

      if (dateTo) {
        params.date_to = dateTo;
      }

      const response = await axios.get('/api/payments/admin', { params });

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

  // 사용자/상품 목록 불러오기 (현금 결제용)
  const fetchUsersAndProducts = async () => {
    try {
      const [usersRes, productsRes] = await Promise.all([
        axios.get('/api/users?limit=1000'),
        axios.get('/api/products?limit=1000'),
      ]);
      setUsers(usersRes.data.users || []);
      setProducts(productsRes.data.products || []);
    } catch (err) {
      console.error('사용자/상품 데이터 로드 실패:', err);
    }
  };

  // 현금 결제 등록 핸들러
  const handleCashPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !cashPaymentForm.user_id ||
      !cashPaymentForm.product_id ||
      !cashPaymentForm.amount
    ) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }
    try {
      await axios.post('/api/payments/admin', {
        user_id: cashPaymentForm.user_id,
        product_id: parseInt(cashPaymentForm.product_id),
        amount: parseFloat(cashPaymentForm.amount),
        payment_memo: cashPaymentForm.payment_memo,
      });
      alert('현금 결제가 등록되었습니다.');
      setShowCashModal(false);
      setCashPaymentForm({
        user_id: '',
        product_id: '',
        amount: '',
        payment_memo: '',
      });
      fetchPayments();
    } catch (err: any) {
      alert(err.response?.data?.error || '현금 결제 등록 실패');
    }
  };

  // 🆕 결제 취소 모달 열기
  const openCancelModal = (paymentId: number) => {
    setCancelPaymentId(paymentId);
    setCancelReason('');
    setShowCancelModal(true);
  };

  // 🆕 결제 취소 처리
  const handleCancelPayment = async () => {
    if (!cancelPaymentId || !cancelReason.trim()) {
      alert('취소 사유를 입력해주세요.');
      return;
    }

    setProcessingCancel(true);
    try {
      const response = await axios.post(
        `/api/payments/admin/${cancelPaymentId}/cancel`,
        {
          reason: cancelReason.trim(),
        }
      );

      if (response.data.success) {
        alert(
          response.data.message +
            (response.data.partial_usage_notice
              ? '\n\n' + response.data.partial_usage_notice
              : '')
        );
        setShowCancelModal(false);
        setCancelPaymentId(null);
        setCancelReason('');
        fetchPayments();
      } else {
        alert(response.data.error || '취소 처리에 실패했습니다.');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || '취소 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessingCancel(false);
    }
  };

  // 🆕 현금 결제 승인 처리
  const handleApproveCashPayment = async (paymentId: number) => {
    if (!confirm('이 현금 결제를 승인하시겠습니까?')) return;

    setProcessingCashAction(paymentId);
    try {
      const response = await axios.post(
        `/api/payments/admin/${paymentId}/approve-cash`
      );

      if (response.data.success) {
        alert(response.data.message);
        fetchPayments();
      } else {
        alert(response.data.error || '승인 처리에 실패했습니다.');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || '승인 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessingCashAction(null);
    }
  };

  // 🆕 현금 결제 거절 처리
  const handleRejectCashPayment = async (paymentId: number) => {
    const reason = prompt('거절 사유를 입력해주세요:');
    if (!reason) return;

    setProcessingCashAction(paymentId);
    try {
      const response = await axios.post(
        `/api/payments/admin/${paymentId}/reject-cash`,
        {
          reason: reason.trim(),
        }
      );

      if (response.data.success) {
        alert(response.data.message);
        fetchPayments();
      } else {
        alert(response.data.error || '거절 처리에 실패했습니다.');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || '거절 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessingCashAction(null);
    }
  };

  // 모달 열기
  const openCashModal = () => {
    fetchUsersAndProducts();
    setShowCashModal(true);
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
      case 'cash_pending':
        return { className: 'status-pending', label: '입금대기' };
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
      case 'CASH':
        return '현금';
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
              <option value="cash_pending">입금대기</option>
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

          {/* 현금 결제 추가 버튼 */}
          <div className="form-control">
            <label htmlFor="cash-payment-button">&nbsp;</label>
            <button
              id="cash-payment-button"
              className="cash-payment-button"
              onClick={openCashModal}
            >
              현금 결제 추가
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
          <div className="summary-title">입금 대기</div>
          <div className="summary-value text-warning">
            {payments.filter((p) => p.status === 'cash_pending').length}건
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
                  <th>액션</th>
                </tr>
              </thead>
              <tbody className="admin-table-body">
                {payments.map((payment) => {
                  const statusInfo = getStatusInfo(payment.status);
                  const isProcessing = processingCashAction === payment.id;

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
                          {payment.depositor_name && (
                            <div className="depositor-name">
                              입금자: {payment.depositor_name}
                            </div>
                          )}
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
                      <td>
                        <div className="action-buttons">
                          {/* 🆕 결제 취소 버튼 */}
                          {payment.status === 'completed' && (
                            <button
                              className="action-btn cancel-btn"
                              onClick={() => openCancelModal(payment.id)}
                              title="결제 취소"
                            >
                              취소
                            </button>
                          )}

                          {/* 🆕 현금 결제 승인/거절 버튼 */}
                          {payment.status === 'cash_pending' && (
                            <>
                              <button
                                className="action-btn approve-btn"
                                onClick={() =>
                                  handleApproveCashPayment(payment.id)
                                }
                                disabled={isProcessing}
                                title="현금 결제 승인"
                              >
                                {isProcessing ? '처리중...' : '승인'}
                              </button>
                              <button
                                className="action-btn reject-btn"
                                onClick={() =>
                                  handleRejectCashPayment(payment.id)
                                }
                                disabled={isProcessing}
                                title="현금 결제 거절"
                              >
                                거절
                              </button>
                            </>
                          )}
                        </div>
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

      {/* 🆕 결제 취소 모달 */}
      {showCancelModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCancelModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>결제 취소</h3>
              <button
                className="modal-close"
                onClick={() => setShowCancelModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="cancel-warning">
                <p>
                  ⚠️ <strong>주의사항</strong>
                </p>
                <ul>
                  <li>결제 취소 시 전액 환불 처리됩니다.</li>
                  <li>이미 배송된 서비스가 있어도 전액 환불됩니다.</li>
                  <li>예정된 배송은 모두 취소됩니다.</li>
                  <li>취소 후에는 되돌릴 수 없습니다.</li>
                </ul>
              </div>
              <div className="form-control">
                <label htmlFor="cancel-reason">취소 사유 *</label>
                <textarea
                  id="cancel-reason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="취소 사유를 입력해주세요"
                  rows={3}
                  required
                />
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={processingCancel}
              >
                취소
              </button>
              <button
                type="button"
                className="danger"
                onClick={handleCancelPayment}
                disabled={processingCancel || !cancelReason.trim()}
              >
                {processingCancel ? '처리중...' : '결제 취소'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 현금 결제 추가 모달 (기존) */}
      {showCashModal && (
        <div className="modal-overlay" onClick={() => setShowCashModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>현금 결제 추가</h3>
              <button
                className="modal-close"
                onClick={() => setShowCashModal(false)}
              >
                ×
              </button>
            </div>
            <form
              onSubmit={handleCashPaymentSubmit}
              className="cash-payment-form"
            >
              <div className="form-control">
                <label htmlFor="cash-user">사용자 *</label>
                <select
                  id="cash-user"
                  value={cashPaymentForm.user_id}
                  onChange={(e) =>
                    setCashPaymentForm({
                      ...cashPaymentForm,
                      user_id: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">사용자 선택</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.id}) - {user.phone_number}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label htmlFor="cash-product">상품 *</label>
                <select
                  id="cash-product"
                  value={cashPaymentForm.product_id}
                  onChange={(e) => {
                    const product = products.find(
                      (p) => p.id === parseInt(e.target.value)
                    );
                    setCashPaymentForm({
                      ...cashPaymentForm,
                      product_id: e.target.value,
                      amount: product ? product.price.toString() : '',
                    });
                  }}
                  required
                >
                  <option value="">상품 선택</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} - {formatCurrency(product.price)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-control">
                <label htmlFor="cash-amount">결제 금액 *</label>
                <input
                  id="cash-amount"
                  type="number"
                  value={cashPaymentForm.amount}
                  onChange={(e) =>
                    setCashPaymentForm({
                      ...cashPaymentForm,
                      amount: e.target.value,
                    })
                  }
                  placeholder="결제 금액"
                  required
                />
              </div>
              <div className="form-control">
                <label htmlFor="cash-memo">메모</label>
                <textarea
                  id="cash-memo"
                  value={cashPaymentForm.payment_memo}
                  onChange={(e) =>
                    setCashPaymentForm({
                      ...cashPaymentForm,
                      payment_memo: e.target.value,
                    })
                  }
                  placeholder="결제 관련 메모 (선택사항)"
                  rows={3}
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCashModal(false)}>
                  취소
                </button>
                <button type="submit" className="primary">
                  등록
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPayments;

// src/pages/catering.tsx
import React, { useEffect, useState } from 'react';
import './catering.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { InquiryProps } from '../types';

declare global {
  interface Window {
    AUTHNICE?: {
      requestPay: (params: NicePayParams) => void;
    };
  }
}

interface NicePayParams {
  clientId: string;
  method: string;
  orderId: string;
  amount: number;
  goodsName: string;
  returnUrl: string;
  timestamp: string;
  signature: string;
  fnError?: (result: { errorMsg: string }) => void;
}

const PAGE_SIZE = 10;

const Catering: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [inquiries, setInquiries] = useState<InquiryProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [newInquiry, setNewInquiry] = useState({ title: '', content: '' });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // 🆕 결제 관련 상태
  const [paymentDialog, setPaymentDialog] = useState<boolean>(false);
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryProps | null>(
    null
  );
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card');
  const [depositorName, setDepositorName] = useState<string>('');
  const [specialRequest, setSpecialRequest] = useState<string>('');
  const [processingPayment, setProcessingPayment] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [deleteDialog, setDeleteDialog] = useState<boolean>(false);
  const [deleteInquiry, setDeleteInquiry] = useState<InquiryProps | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchInquiries();
      loadNicePaySDK();
    }
  }, [currentPage, isAuthenticated]);

  const loadNicePaySDK = () => {
    if (window.AUTHNICE) return;

    const script = document.createElement('script');
    script.src = 'https://pay.nicepay.co.kr/v1/js/';
    script.async = true;
    script.onload = () => console.log('NICE Pay SDK 로드 완료');
    script.onerror = () => setError('결제 시스템 로드 실패');
    document.head.appendChild(script);
  };

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      // 🔧 인증 헤더와 함께 요청 (기존 문제 해결)
      const response = await axios.get('/api/inquiries', {
        params: {
          page: currentPage,
          limit: PAGE_SIZE,
          category: 'catering',
        },
        // 자동으로 세션 쿠키가 포함되어 전송됨
      });

      setInquiries(response.data.inquiries);

      const total = response.data.pagination?.total ?? 0;
      setTotalPages(Math.ceil(total / PAGE_SIZE) || 1);

      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch catering inquiries:', err);
      setError('단체주문 문의 내역을 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleInquiryClick = (inquiry: InquiryProps) => {
    navigate(`/inquiry/${inquiry.id}`);
  };

  // 🆕 결제 모달 열기
  const handlePaymentClick = (inquiry: InquiryProps) => {
    setSelectedInquiry(inquiry);
    setPaymentMethod('card');
    setDepositorName('');
    setSpecialRequest('');
    setPaymentError(null);
    setPaymentDialog(true);
  };

  // 🆕 결제 모달 닫기
  const handleClosePaymentDialog = () => {
    setPaymentDialog(false);
    setSelectedInquiry(null);
    setPaymentMethod('card');
    setDepositorName('');
    setSpecialRequest('');
    setPaymentError(null);
  };

  // 🆕 결제 처리
  const handleSubmitPayment = async () => {
    if (!selectedInquiry) return;

    setProcessingPayment(true);
    setPaymentError(null);

    try {
      if (paymentMethod === 'cash') {
        await handleCashPayment();
      } else {
        await handleCardPayment();
      }
    } catch (err: any) {
      setPaymentError(err.message || '결제 처리 중 오류 발생');
      setProcessingPayment(false);
    }
  };

  // 🆕 현금 결제 처리
  const handleCashPayment = async () => {
    if (!selectedInquiry || !depositorName.trim()) {
      throw new Error('입금자명을 입력해주세요.');
    }

    const response = await axios.post('/api/payments/catering-cash-prepare', {
      inquiry_id: selectedInquiry.id,
      depositor_name: depositorName.trim(),
      special_request: specialRequest.trim() || null,
    });

    if (!response.data.success) {
      throw new Error(response.data.error || '현금 결제 요청 실패');
    }

    // 현금 결제 결과 페이지로 이동
    navigate(
      `/payment-result?success=true&orderId=${response.data.order_id}&paymentMethod=cash&status=cash_pending&amount=${selectedInquiry.payment_amount}`
    );
  };

  // 🆕 카드 결제 처리
  const handleCardPayment = async () => {
    if (!selectedInquiry) return;

    const response = await axios.post('/api/payments/catering-prepare', {
      inquiry_id: selectedInquiry.id,
      special_request: specialRequest.trim() || null,
    });

    if (!response.data.success) {
      throw new Error(response.data.error || '결제 준비 실패');
    }

    const { paramsForNicePaySDK } = response.data;

    if (!window.AUTHNICE) {
      throw new Error('결제 시스템이 준비되지 않았습니다.');
    }

    window.AUTHNICE.requestPay({
      ...paramsForNicePaySDK,
      fnError: (result) => {
        setPaymentError(`결제 오류: ${result.errorMsg || '알 수 없는 오류'}`);
        setProcessingPayment(false);
      },
    });
  };

  const handleOpenDialog = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setOpenDialog(true);
    setDialogError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewInquiry({ title: '', content: '' });
    setDialogError(null);
  };

  const handleSubmitInquiry = async () => {
    if (!newInquiry.title.trim()) {
      setDialogError('제목을 입력해주세요.');
      return;
    }

    if (!newInquiry.content.trim()) {
      setDialogError('내용을 입력해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      await axios.post('/api/inquiries', {
        title: newInquiry.title,
        content: newInquiry.content,
        category: 'catering',
      });

      handleCloseDialog();
      fetchInquiries();
    } catch (err) {
      console.error('Failed to submit catering inquiry:', err);
      setDialogError('단체주문 문의 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // 삭제 핸들러 추가
  const handleDeleteClick = (inquiry: InquiryProps, e: React.MouseEvent) => {
    e.stopPropagation(); // 행 클릭 이벤트 방지
    setDeleteInquiry(inquiry);
    setDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteInquiry) return;

    setDeleting(true);
    try {
      await axios.delete(`/api/inquiries/${deleteInquiry.id}`);
      setDeleteDialog(false);
      setDeleteInquiry(null);
      fetchInquiries();
    } catch (err: any) {
      console.error('Failed to delete inquiry:', err);
      alert(err.response?.data?.error || '문의 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialog(false);
    setDeleteInquiry(null);
  };

  const renderPageButtons = () => {
    const buttons = [];

    for (let i = 1; i <= totalPages; i++) {
      buttons.push(
        <button
          key={i}
          className={`page-button ${currentPage === i ? 'active' : ''}`}
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </button>
      );
    }

    return buttons;
  };

  // 🆕 결제 방법 선택 렌더링
  const renderPaymentMethodSelection = () => {
    return (
      <div className="payment-method-section">
        <h4>결제 방법 선택</h4>
        <div className="payment-method-options">
          <label
            className={`payment-method-option ${paymentMethod === 'card' ? 'selected' : ''}`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={paymentMethod === 'card'}
              onChange={(e) =>
                setPaymentMethod(e.target.value as 'card' | 'cash')
              }
            />
            <div className="payment-method-info">
              <span className="payment-method-name">💳 카드 결제</span>
              <span className="payment-method-desc">
                안전하고 빠른 온라인 카드 결제
              </span>
            </div>
          </label>

          <label
            className={`payment-method-option ${paymentMethod === 'cash' ? 'selected' : ''}`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="cash"
              checked={paymentMethod === 'cash'}
              onChange={(e) =>
                setPaymentMethod(e.target.value as 'card' | 'cash')
              }
            />
            <div className="payment-method-info">
              <span className="payment-method-name">
                🏦 현금 결제 (계좌이체)
              </span>
              <span className="payment-method-desc">
                계좌이체 후 관리자 승인
              </span>
            </div>
          </label>
        </div>

        {paymentMethod === 'cash' && (
          <div className="cash-payment-info">
            <div className="depositor-name-section">
              <label htmlFor="depositorName">입금자명 *</label>
              <input
                id="depositorName"
                type="text"
                value={depositorName}
                onChange={(e) => setDepositorName(e.target.value)}
                placeholder="입금하실 분의 성함을 입력해주세요"
                maxLength={20}
                required
              />
            </div>

            <div className="account-info-highlight">
              <h5>📋 입금 계좌 정보</h5>
              <div className="account-details">
                <p>
                  <strong>은행:</strong> 카카오뱅크
                </p>
                <p>
                  <strong>계좌번호:</strong>{' '}
                  <span className="account-number">3333-30-8265756</span>
                </p>
                <p>
                  <strong>예금주:</strong> 김봉준
                </p>
                <p>
                  <strong>입금금액:</strong>{' '}
                  {selectedInquiry?.payment_amount?.toLocaleString()}원
                </p>
              </div>
              <div className="cash-payment-notice">
                <p>⚠️ 입금 후 관리자 확인까지 시간이 소요될 수 있습니다.</p>
                <p>📞 문의사항이 있으시면 고객센터로 연락해주세요.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 로그인하지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className="catering-container">
        <div className="catering-header">
          <div className="catering-title-section">
            <h1 className="catering-title">단체주문/케이터링 문의</h1>
            <p className="catering-description">
              단체 주문이나 케이터링 서비스에 대한 문의사항을 남겨주세요.
            </p>
          </div>
        </div>
        <div className="alert alert-info">
          단체주문 문의를 작성하고 확인하려면 로그인이 필요합니다.
          <br />
          <button
            className="login-link-button"
            onClick={() => navigate('/login')}
          >
            로그인하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="catering-container">
      <div className="catering-header">
        <div className="catering-title-section">
          <h1 className="catering-title">단체주문/케이터링 문의</h1>
          <p className="catering-description">
            단체 주문이나 케이터링 서비스에 대한 문의사항을 남겨주세요. 빠른
            시일 내에 답변드리겠습니다.
          </p>
        </div>

        <button
          className="add-button catering-add-button"
          onClick={handleOpenDialog}
        >
          <span className="add-icon">+</span>
          단체주문 문의
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      ) : error ? (
        <div className="alert alert-error">⚠️ {error}</div>
      ) : inquiries.length === 0 ? (
        <div className="alert alert-info">등록된 단체주문 문의가 없습니다.</div>
      ) : (
        <div className="catering-table-container">
          <table className="catering-table">
            <thead>
              <tr>
                <th>제목</th>
                <th className="date-column">작성일</th>
                <th style={{ textAlign: 'center' }}>상태</th>
                <th style={{ textAlign: 'center' }}>결제</th>
                <th style={{ textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td
                    className="inquiry-title"
                    onClick={() => handleInquiryClick(inquiry)}
                  >
                    {inquiry.title}
                  </td>
                  <td className="date-column">
                    {new Date(inquiry.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span
                      className={`status-chip ${
                        inquiry.status === 'answered'
                          ? 'status-answered'
                          : 'status-unanswered'
                      }`}
                    >
                      {inquiry.status === 'answered' ? '답변 완료' : '미답변'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {inquiry.payment_requested ? (
                      <button
                        className="payment-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePaymentClick(inquiry);
                        }}
                      >
                        결제하기
                        <br />
                        <small>
                          ({inquiry.payment_amount?.toLocaleString()}원)
                        </small>
                      </button>
                    ) : (
                      <span className="no-payment">-</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="delete-btn"
                      onClick={(e) => handleDeleteClick(inquiry, e)}
                      title="문의 삭제"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && inquiries.length > 0 && (
        <div className="pagination">{renderPageButtons()}</div>
      )}

      {/* New Catering Inquiry Dialog */}
      {openDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <div className="dialog-title">단체주문/케이터링 문의 등록</div>
            <div className="dialog-content">
              {dialogError && (
                <div className="alert alert-error">{dialogError}</div>
              )}
              <div className="form-group">
                <label htmlFor="catering-title" className="form-label">
                  제목
                </label>
                <input
                  id="catering-title"
                  type="text"
                  className="form-control"
                  placeholder="예: 회사 단체 도시락 주문 문의"
                  value={newInquiry.title}
                  onChange={(e) =>
                    setNewInquiry({ ...newInquiry, title: e.target.value })
                  }
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="catering-content" className="form-label">
                  내용
                </label>
                <textarea
                  id="catering-content"
                  className="form-control"
                  rows={6}
                  placeholder="주문 예정 인원, 희망 일자, 메뉴 선호도, 기타 요청사항 등을 상세히 적어주세요."
                  value={newInquiry.content}
                  onChange={(e) =>
                    setNewInquiry({ ...newInquiry, content: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="dialog-actions">
              <button
                className="btn-cancel"
                onClick={handleCloseDialog}
                disabled={submitting}
              >
                취소
              </button>
              <button
                className="btn-submit"
                onClick={handleSubmitInquiry}
                disabled={submitting}
              >
                {submitting ? '등록 중...' : '등록'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🆕 Payment Dialog */}
      {paymentDialog && selectedInquiry && (
        <div className="dialog-overlay">
          <div className="dialog payment-dialog">
            <div className="dialog-title">케이터링 서비스 결제</div>
            <div className="dialog-content">
              <div className="inquiry-info">
                <h4>주문 정보</h4>
                <div className="inquiry-details">
                  <p>
                    <strong>제목:</strong> {selectedInquiry.title}
                  </p>
                  <p>
                    <strong>결제 금액:</strong>{' '}
                    {selectedInquiry.payment_amount?.toLocaleString()}원
                  </p>
                </div>
              </div>

              {paymentError && (
                <div className="alert alert-error">{paymentError}</div>
              )}

              {renderPaymentMethodSelection()}

              <div className="form-group">
                <label htmlFor="special-request" className="form-label">
                  특별 요청사항 (선택)
                </label>
                <textarea
                  id="special-request"
                  className="form-control"
                  rows={3}
                  placeholder="배송이나 서비스에 대한 특별한 요청사항이 있으시면 입력해주세요."
                  value={specialRequest}
                  onChange={(e) => setSpecialRequest(e.target.value)}
                  maxLength={500}
                />
                <div className="char-count">{specialRequest.length}/500</div>
              </div>
            </div>
            <div className="dialog-actions">
              <button
                className="btn-cancel"
                onClick={handleClosePaymentDialog}
                disabled={processingPayment}
              >
                취소
              </button>
              <button
                className="btn-submit"
                onClick={handleSubmitPayment}
                disabled={
                  processingPayment ||
                  (paymentMethod === 'cash' && !depositorName.trim())
                }
              >
                {processingPayment ? (
                  <div className="loading-spinner small"></div>
                ) : paymentMethod === 'cash' ? (
                  '입금 정보 확인 후 주문하기'
                ) : (
                  '안전결제 진행하기'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteDialog && deleteInquiry && (
        <div className="dialog-overlay">
          <div className="dialog delete-dialog">
            <div className="dialog-title">문의 삭제</div>
            <div className="dialog-content">
              <div className="delete-warning">
                <p>
                  ⚠️ <strong>주의사항</strong>
                </p>
                <ul>
                  <li>삭제된 문의는 복구할 수 없습니다.</li>
                  <li>관련된 답변도 함께 삭제됩니다.</li>
                  <li>
                    결제가 완료된 문의는 삭제하기 전에 관리자에게 문의하세요.
                  </li>
                </ul>
              </div>
              <div className="delete-inquiry-info">
                <p>
                  <strong>삭제할 문의:</strong> {deleteInquiry.title}
                </p>
                <p>
                  <strong>작성일:</strong>{' '}
                  {new Date(deleteInquiry.created_at).toLocaleDateString()}
                </p>
              </div>
              <p>정말로 이 문의를 삭제하시겠습니까?</p>
            </div>
            <div className="dialog-actions">
              <button
                className="btn-cancel"
                onClick={handleDeleteCancel}
                disabled={deleting}
              >
                취소
              </button>
              <button
                className="btn-delete"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Catering;

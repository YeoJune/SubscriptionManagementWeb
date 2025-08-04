// src/pages/admin/cateringInquiry.tsx
import React, { useEffect, useState } from 'react';
import './cateringInquiry.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { InquiryProps } from '../../types';

const PAGE_SIZE = 10;

const AdminCateringInquiry: React.FC = () => {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<InquiryProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryProps | null>(
    null
  );
  const [answer, setAnswer] = useState<string>('');
  const [answerDialog, setAnswerDialog] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [answerError, setAnswerError] = useState<string | null>(null);

  // 🆕 결제 요청 관련 상태
  const [requestPayment, setRequestPayment] = useState<boolean>(false);
  const [paymentAmount, setPaymentAmount] = useState<string>('');

  useEffect(() => {
    fetchInquiries();
  }, [currentPage, statusFilter, searchTerm]);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: currentPage,
        limit: PAGE_SIZE,
        category: 'catering',
      };

      if (statusFilter) {
        params.status = statusFilter;
      }

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await axios.get('/api/inquiries', { params });

      setInquiries(response.data.inquiries);

      const total = response.data.pagination?.total ?? 0;
      setTotalPages(Math.ceil(total / PAGE_SIZE) || 1);

      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch catering inquiries:', err);
      setError('단체주문 문의를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleInquiryClick = (inquiry: InquiryProps) => {
    navigate(`/inquiry/${inquiry.id}`);
  };

  const handleAnswerClick = (inquiry: InquiryProps) => {
    setSelectedInquiry(inquiry);
    setAnswer(inquiry.answer || '');
    setRequestPayment(inquiry.payment_requested || false);
    setPaymentAmount(inquiry.payment_amount?.toString() || '');
    setAnswerDialog(true);
    setAnswerError(null);
  };

  const handleCloseAnswerDialog = () => {
    setAnswerDialog(false);
    setSelectedInquiry(null);
    setAnswer('');
    setRequestPayment(false);
    setPaymentAmount('');
    setAnswerError(null);
  };

  // 🔧 답변 제출 함수 수정 (결제 요청 기능 추가)
  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      setAnswerError('답변 내용을 입력해주세요.');
      return;
    }

    if (requestPayment && (!paymentAmount || parseFloat(paymentAmount) <= 0)) {
      setAnswerError('결제 요청 시 올바른 금액을 입력해주세요.');
      return;
    }

    if (!selectedInquiry) return;

    setSubmitting(true);

    try {
      if (requestPayment) {
        // 🆕 결제 요청과 함께 답변 등록
        await axios.put(
          `/api/inquiries/${selectedInquiry.id}/request-payment`,
          {
            answer: answer.trim(),
            payment_amount: parseInt(paymentAmount),
          }
        );
      } else {
        // 기존 답변만 등록
        await axios.put(`/api/inquiries/${selectedInquiry.id}/answer`, {
          answer: answer.trim(),
        });
      }

      handleCloseAnswerDialog();
      fetchInquiries();
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setAnswerError('답변 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusFilterChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    setCurrentPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchInquiries();
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

  return (
    <div className="admin-catering-container">
      <div className="admin-catering-header">
        <h1 className="admin-catering-title">단체주문/케이터링 문의 관리</h1>
        <p className="admin-catering-description">
          고객들의 단체주문 및 케이터링 문의를 관리하고 답변을 등록할 수
          있습니다.
        </p>
      </div>

      {/* Filters and Search */}
      <div className="admin-filters">
        <div className="status-filters">
          <button
            className={`filter-btn ${statusFilter === '' ? 'active' : ''}`}
            onClick={() => handleStatusFilterChange('')}
          >
            전체
          </button>
          <button
            className={`filter-btn ${statusFilter === 'unanswered' ? 'active' : ''}`}
            onClick={() => handleStatusFilterChange('unanswered')}
          >
            미답변
          </button>
          <button
            className={`filter-btn ${statusFilter === 'answered' ? 'active' : ''}`}
            onClick={() => handleStatusFilterChange('answered')}
          >
            답변완료
          </button>
        </div>

        <form onSubmit={handleSearchSubmit} className="search-form">
          <input
            type="text"
            placeholder="제목이나 내용으로 검색..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button type="submit" className="search-btn">
            검색
          </button>
        </form>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      ) : error ? (
        <div className="alert alert-error">⚠️ {error}</div>
      ) : inquiries.length === 0 ? (
        <div className="alert alert-info">
          조건에 맞는 단체주문 문의가 없습니다.
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-catering-table">
            <thead>
              <tr>
                <th>고객명</th>
                <th>제목</th>
                <th className="date-column">작성일</th>
                <th style={{ textAlign: 'center' }}>상태</th>
                <th style={{ textAlign: 'center' }}>결제 요청</th>
                <th style={{ textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td className="user-name">{inquiry.user_name}</td>
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
                      <div className="payment-requested-info">
                        <span className="payment-chip payment-requested">
                          결제 요청됨
                        </span>
                        <div className="payment-amount">
                          {inquiry.payment_amount?.toLocaleString()}원
                        </div>
                      </div>
                    ) : (
                      <span className="payment-chip payment-not-requested">
                        -
                      </span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="answer-btn"
                      onClick={() => handleAnswerClick(inquiry)}
                    >
                      {inquiry.status === 'answered'
                        ? '답변 수정'
                        : '답변 등록'}
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

      {/* Answer Dialog */}
      {answerDialog && selectedInquiry && (
        <div className="dialog-overlay">
          <div className="dialog answer-dialog">
            <div className="dialog-title">
              {selectedInquiry.status === 'answered'
                ? '답변 수정'
                : '답변 등록'}
            </div>
            <div className="dialog-content">
              <div className="inquiry-info">
                <h4>문의 내용</h4>
                <div className="inquiry-details">
                  <p>
                    <strong>고객:</strong> {selectedInquiry.user_name}
                  </p>
                  <p>
                    <strong>제목:</strong> {selectedInquiry.title}
                  </p>
                  <div className="inquiry-content">
                    <strong>내용:</strong>
                    <div className="content-text">
                      {selectedInquiry.content}
                    </div>
                  </div>
                </div>
              </div>

              {answerError && (
                <div className="alert alert-error">{answerError}</div>
              )}

              <div className="form-group">
                <label htmlFor="answer-content" className="form-label">
                  답변 내용
                </label>
                <textarea
                  id="answer-content"
                  className="form-control answer-textarea"
                  rows={6}
                  placeholder="고객에게 전달할 답변을 입력해주세요..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  autoFocus
                />
              </div>

              {/* 🆕 결제 요청 섹션 */}
              <div className="payment-request-section">
                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={requestPayment}
                      onChange={(e) => setRequestPayment(e.target.checked)}
                    />
                    <span className="checkbox-text">결제 요청하기</span>
                  </label>
                  <small className="form-help">
                    체크하면 고객이 답변 확인 후 결제를 진행할 수 있습니다.
                  </small>
                </div>

                {requestPayment && (
                  <div className="payment-amount-section">
                    <div className="form-group">
                      <label htmlFor="payment-amount" className="form-label">
                        결제 금액 (원) *
                      </label>
                      <input
                        id="payment-amount"
                        type="number"
                        className="form-control"
                        placeholder="예: 50000"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        min="1000"
                        step="1000"
                        required={requestPayment}
                      />
                      <small className="form-help">
                        고객에게 요청할 결제 금액을 입력해주세요.
                      </small>
                    </div>

                    <div className="payment-request-info">
                      <h5>💡 결제 요청 안내</h5>
                      <ul>
                        <li>
                          결제 요청 시 고객은 카드결제 또는 현금결제를 선택할 수
                          있습니다.
                        </li>
                        <li>현금결제의 경우 관리자 승인이 필요합니다.</li>
                        <li>
                          결제 완료 후 해당 문의의 결제 상태가 업데이트됩니다.
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="dialog-actions">
              <button
                className="btn-cancel"
                onClick={handleCloseAnswerDialog}
                disabled={submitting}
              >
                취소
              </button>
              <button
                className="btn-submit"
                onClick={handleSubmitAnswer}
                disabled={submitting}
              >
                {submitting
                  ? '등록 중...'
                  : requestPayment
                    ? '답변 + 결제 요청'
                    : '답변 등록'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCateringInquiry;

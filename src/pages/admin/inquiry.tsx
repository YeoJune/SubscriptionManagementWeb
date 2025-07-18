// src/pages/admin/inquiry.tsx
import React, { useState, useEffect } from 'react';
import './inquiry.css';
import axios from 'axios';
import { InquiryProps } from '../../types';
import { useAuth } from '../../hooks/useAuth';

const AdminInquiry: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [inquiries, setInquiries] = useState<InquiryProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryProps | null>(
    null
  );
  const [openDialog, setOpenDialog] = useState(false);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      fetchInquiries();
    }
  }, [page, rowsPerPage, filterStatus]);

  const fetchInquiries = async () => {
    setLoading(true);
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

      const response = await axios.get('/api/inquiries', { params });

      setInquiries(response.data.inquiries);
      setTotal(response.data.pagination?.total || 0);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
      setError('문의 내역을 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleRowClick = (inquiry: InquiryProps) => {
    setSelectedInquiry(inquiry);
    setAnswer(inquiry.answer || '');
    setOpenDialog(true);
    setDialogError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedInquiry(null);
    setAnswer('');
    setDialogError(null);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedInquiry) return;

    if (!answer.trim()) {
      setDialogError('답변 내용을 입력해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      await axios.put(`/api/inquiries/${selectedInquiry.id}/answer`, {
        answer,
      });

      handleCloseDialog();
      fetchInquiries();
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setDialogError('답변 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
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

  const handleSearch = () => {
    setPage(0);
    fetchInquiries();
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setPage(0);
    // 검색어 초기화 후 자동으로 재검색
    setTimeout(() => fetchInquiries(), 0);
  };

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <div className="inquiry-admin-container">
        <div className="alert alert-error">접근 권한이 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="inquiry-admin-container">
      <h1 className="inquiry-admin-title">고객의 소리 관리</h1>

      <div className="filter-box">
        <select
          className="filter-select"
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setPage(0);
          }}
        >
          <option value="all">전체</option>
          <option value="unanswered">미답변</option>
          <option value="answered">답변완료</option>
        </select>

        <div className="search-field">
          <input
            type="text"
            className="search-input"
            placeholder="검색어를 입력하세요"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <div className="search-buttons">
            {searchTerm && (
              <button
                className="clear-button"
                onClick={handleClearSearch}
                title="검색어 지우기"
              >
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path
                    fill="currentColor"
                    d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                  />
                </svg>
              </button>
            )}
            <button
              className="search-button"
              onClick={handleSearch}
              title="검색"
            >
              <svg viewBox="0 0 24 24" width="18" height="18">
                <path
                  fill="currentColor"
                  d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
                />
              </svg>
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
      ) : inquiries.length === 0 ? (
        <div className="alert alert-info">문의 내역이 없습니다.</div>
      ) : (
        <>
          <div className="inquiry-table-container">
            <table className="inquiry-table">
              <thead className="inquiry-table-head">
                <tr>
                  <th>ID</th>
                  <th>제목</th>
                  <th>사용자</th>
                  <th>작성일</th>
                  <th style={{ textAlign: 'center' }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inquiry) => (
                  <tr
                    key={inquiry.id}
                    className="inquiry-table-row"
                    onClick={() => handleRowClick(inquiry)}
                  >
                    <td className="inquiry-table-cell">{inquiry.id}</td>
                    <td className="inquiry-table-cell">{inquiry.title}</td>
                    <td className="inquiry-table-cell">
                      {inquiry.user_name || inquiry.user_id}
                    </td>
                    <td className="inquiry-table-cell">
                      {new Date(inquiry.created_at).toLocaleDateString()}
                    </td>
                    <td
                      className="inquiry-table-cell"
                      style={{ textAlign: 'center' }}
                    >
                      <span
                        className={`status-chip ${inquiry.status === 'answered' ? 'status-success' : 'status-warning'}`}
                      >
                        {inquiry.status === 'answered' ? '답변완료' : '미답변'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pagination-container">
            <span className="pagination-text">페이지당 행 수:</span>
            <select
              className="pagination-select"
              value={rowsPerPage}
              onChange={handleChangeRowsPerPage}
            >
              {[10, 25, 50].map((num) => (
                <option key={num} value={num}>
                  {num}
                </option>
              ))}
            </select>
            <span className="pagination-text">
              {page * rowsPerPage + 1}-
              {Math.min((page + 1) * rowsPerPage, total)} / 전체 {total}
            </span>
            <div className="pagination-buttons">
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

      {/* 답변 다이얼로그 */}
      {openDialog && selectedInquiry && (
        <div className="dialog">
          <div className="dialog-paper">
            <div className="dialog-title">
              문의 답변 - {selectedInquiry.title}
            </div>
            <div className="dialog-content">
              {dialogError && (
                <div className="alert alert-error">{dialogError}</div>
              )}

              <div className="dialog-meta">
                <strong>작성자:</strong>{' '}
                {selectedInquiry.user_name || selectedInquiry.user_id}
              </div>

              <div className="dialog-meta">
                <strong>작성일:</strong>{' '}
                {new Date(selectedInquiry.created_at).toLocaleString()}
              </div>

              <div className="inquiry-content-box">
                <div className="inquiry-content-text">
                  {selectedInquiry.content.split('\n').map((line, index) => (
                    <span key={index}>
                      {line}
                      <br />
                    </span>
                  ))}
                </div>
              </div>

              <div className="answer-field">
                <label htmlFor="answer">답변</label>
                <textarea
                  id="answer"
                  className="answer-textarea"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="답변을 입력해주세요"
                  rows={8}
                />
              </div>
            </div>
            <div className="dialog-actions">
              <button
                className="cancel-button"
                onClick={handleCloseDialog}
                disabled={submitting}
              >
                취소
              </button>
              <button
                className="submit-button"
                onClick={handleSubmitAnswer}
                disabled={submitting}
              >
                {submitting ? '저장 중...' : '답변 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInquiry;

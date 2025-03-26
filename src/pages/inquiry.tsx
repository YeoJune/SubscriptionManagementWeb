// src/pages/inquiry.tsx
import React, { useEffect, useState } from 'react';
import './inquiry.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { InquiryProps } from '../types';

const PAGE_SIZE = 10;

const Inquiry: React.FC = () => {
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

  useEffect(() => {
    fetchInquiries();
  }, [currentPage]);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/inquiries', {
        params: { page: currentPage, limit: PAGE_SIZE },
      });

      setInquiries(response.data.inquiries);

      const total = response.data.pagination?.total ?? 0;
      setTotalPages(Math.ceil(total / PAGE_SIZE) || 1);

      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
      setError('문의 내역을 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleInquiryClick = (inquiry: InquiryProps) => {
    navigate(`/inquiry/${inquiry.id}`);
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
      });

      handleCloseDialog();
      fetchInquiries();
    } catch (err) {
      console.error('Failed to submit inquiry:', err);
      setDialogError('문의 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
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
    <div className="inquiry-container">
      <div className="inquiry-header">
        <h1 className="inquiry-title">고객의 소리</h1>

        <button className="add-button" onClick={handleOpenDialog}>
          <span className="add-icon">+</span>
          문의 등록
        </button>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      ) : error ? (
        <div className="alert alert-error">⚠️ {error}</div>
      ) : inquiries.length === 0 ? (
        <div className="alert alert-info">등록된 문의가 없습니다.</div>
      ) : (
        <div className="inquiry-table-container">
          <table className="inquiry-table">
            <thead>
              <tr>
                <th>제목</th>
                <th className="date-column">작성일</th>
                <th style={{ textAlign: 'center' }}>상태</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inquiry) => (
                <tr
                  key={inquiry.id}
                  onClick={() => handleInquiryClick(inquiry)}
                >
                  <td>{inquiry.title}</td>
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

      {/* New Inquiry Dialog */}
      {openDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <div className="dialog-title">새 문의 등록</div>
            <div className="dialog-content">
              {dialogError && (
                <div className="alert alert-error">{dialogError}</div>
              )}
              <div className="form-group">
                <label htmlFor="inquiry-title" className="form-label">
                  제목
                </label>
                <input
                  id="inquiry-title"
                  type="text"
                  className="form-control"
                  value={newInquiry.title}
                  onChange={(e) =>
                    setNewInquiry({ ...newInquiry, title: e.target.value })
                  }
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="inquiry-content" className="form-label">
                  내용
                </label>
                <textarea
                  id="inquiry-content"
                  className="form-control"
                  rows={5}
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
    </div>
  );
};

export default Inquiry;

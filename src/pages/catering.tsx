// src/pages/catering.tsx
import React, { useEffect, useState } from 'react';
import './catering.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { InquiryProps } from '../types';

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

  useEffect(() => {
    fetchInquiries();
  }, [currentPage]);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/inquiries', {
        params: {
          page: currentPage,
          limit: PAGE_SIZE,
          category: 'catering',
        },
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
    </div>
  );
};

export default Catering;

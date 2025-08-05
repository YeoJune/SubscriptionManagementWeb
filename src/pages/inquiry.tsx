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

  // 🆕 익명 문의 관련 상태
  const [isAnonymous, setIsAnonymous] = useState<boolean>(false);
  const [anonymousName, setAnonymousName] = useState<string>('');

  useEffect(() => {
    fetchInquiries();
  }, [currentPage]);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      // 🔧 category 파라미터 추가하여 일반 문의만 조회
      const response = await axios.get('/api/inquiries', {
        params: {
          page: currentPage,
          limit: PAGE_SIZE,
          category: 'general', // 일반 문의만 조회
        },
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
    setOpenDialog(true);
    setDialogError(null);
    // 🔧 로그인 상태에 따라 기본 설정
    if (!isAuthenticated) {
      setIsAnonymous(true);
    }
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewInquiry({ title: '', content: '' });
    setAnonymousName('');
    setIsAnonymous(false);
    setDialogError(null);
  };

  const handleSubmitInquiry = async () => {
    // 기본 유효성 검사
    if (!newInquiry.title.trim()) {
      setDialogError('제목을 입력해주세요.');
      return;
    }

    if (!newInquiry.content.trim()) {
      setDialogError('내용을 입력해주세요.');
      return;
    }

    // 🆕 익명 문의 시 이름 확인
    if (isAnonymous && !anonymousName.trim()) {
      setDialogError('이름을 입력해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      // 🔧 로그인/익명 여부에 따라 다른 데이터 전송
      const requestData = {
        title: newInquiry.title,
        content: newInquiry.content,
        category: 'general', // 일반 문의
        ...(isAnonymous && { anonymous_name: anonymousName.trim() }),
      };

      await axios.post('/api/inquiries', requestData);

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

  // 🆕 작성자 표시 함수
  const getAuthorDisplay = (inquiry: InquiryProps) => {
    if (inquiry.anonymous_name) {
      return inquiry.anonymous_name;
    }
    return inquiry.user_name || '****';
  };

  return (
    <div className="inquiry-container">
      <div className="inquiry-header">
        <h1 className="inquiry-title">불편/건의 사항</h1>

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
                <th>작성자</th>
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
                  <td className="author-column">{getAuthorDisplay(inquiry)}</td>
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

      {/* 🔧 New Inquiry Dialog - 익명 옵션 추가 */}
      {openDialog && (
        <div className="dialog-overlay">
          <div className="dialog">
            <div className="dialog-title">새 문의 등록</div>
            <div className="dialog-content">
              {dialogError && (
                <div className="alert alert-error">{dialogError}</div>
              )}

              {/* 🆕 로그인/익명 선택 (로그인한 사용자만) */}
              {isAuthenticated && (
                <div className="form-group">
                  <label className="form-label">작성 방법</label>
                  <div className="radio-group">
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="inquiry-type"
                        checked={!isAnonymous}
                        onChange={() => setIsAnonymous(false)}
                      />
                      <span>로그인 사용자로 작성</span>
                    </label>
                    <label className="radio-option">
                      <input
                        type="radio"
                        name="inquiry-type"
                        checked={isAnonymous}
                        onChange={() => setIsAnonymous(true)}
                      />
                      <span>익명으로 작성</span>
                    </label>
                  </div>
                </div>
              )}

              {/* 🆕 익명 작성 시 이름 입력 */}
              {isAnonymous && (
                <div className="form-group">
                  <label htmlFor="anonymous-name" className="form-label">
                    이름 *
                  </label>
                  <input
                    id="anonymous-name"
                    type="text"
                    className="form-control"
                    placeholder="표시될 이름을 입력해주세요"
                    value={anonymousName}
                    onChange={(e) => setAnonymousName(e.target.value)}
                    maxLength={10}
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="inquiry-title" className="form-label">
                  제목 *
                </label>
                <input
                  id="inquiry-title"
                  type="text"
                  className="form-control"
                  value={newInquiry.title}
                  onChange={(e) =>
                    setNewInquiry({ ...newInquiry, title: e.target.value })
                  }
                  autoFocus={!isAnonymous}
                />
              </div>
              <div className="form-group">
                <label htmlFor="inquiry-content" className="form-label">
                  내용 *
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

              {/* 🆕 익명 문의 안내 */}
              {isAnonymous && (
                <div className="anonymous-notice">
                  <p>📝 익명 문의 안내</p>
                  <ul>
                    <li>입력하신 이름으로 문의가 표시됩니다</li>
                    <li>모든 사용자가 내용을 열람할 수 있습니다</li>
                    <li>수정/삭제가 제한될 수 있습니다</li>
                  </ul>
                </div>
              )}
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

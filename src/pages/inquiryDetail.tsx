// src/pages/inquiryDetail.tsx
import React, { useState, useEffect } from 'react';
import './inquiryDetail.css';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { InquiryProps } from '../types';
import { useAuth } from '../hooks/useAuth';

const InquiryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [inquiry, setInquiry] = useState<InquiryProps | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({ title: '', content: '' });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  // 🆕 익명 문의 비밀번호 확인 관련 상태
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifiedAnonymous, setVerifiedAnonymous] = useState<boolean>(false);

  // 🆕 익명 문의 수정/삭제용 비밀번호 상태
  const [anonymousPassword, setAnonymousPassword] = useState<string>('');

  useEffect(() => {
    if (!id) {
      setError('유효하지 않은 문의 ID입니다.');
      setLoading(false);
      return;
    }
    fetchInquiry(id);
  }, [id]);

  const fetchInquiry = async (inquiryId: string) => {
    try {
      const response = await axios.get(`/api/inquiries/${inquiryId}`);
      setInquiry(response.data);
      setEditForm({
        title: response.data.title,
        content: response.data.content,
      });
      setLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch inquiry:', err);

      // 🔧 케이터링 문의의 익명 비밀번호 확인 필요
      if (
        err.response?.status === 403 &&
        err.response?.data?.requiresPassword
      ) {
        setShowPasswordModal(true);
        setLoading(false);
      } else {
        setError(
          err.response?.data?.error ||
            '문의 정보를 불러오는 중 오류가 발생했습니다.'
        );
        setLoading(false);
      }
    }
  };

  // 🆕 익명 비밀번호 확인
  const verifyAnonymousPassword = async () => {
    if (!passwordInput.trim()) {
      setPasswordError('비밀번호를 입력해주세요.');
      return;
    }

    try {
      const response = await axios.post(
        `/api/inquiries/${id}/verify-anonymous`,
        {
          password: passwordInput.trim(),
        }
      );

      if (response.data.success) {
        setInquiry(response.data.inquiry);
        setEditForm({
          title: response.data.inquiry.title,
          content: response.data.inquiry.content,
        });
        setVerifiedAnonymous(true);
        setShowPasswordModal(false);
        setPasswordInput('');
        setPasswordError(null);
      }
    } catch (err: any) {
      console.error('Failed to verify password:', err);
      setPasswordError(
        err.response?.data?.error || '비밀번호 확인 중 오류가 발생했습니다.'
      );
    }
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    if (inquiry) {
      setEditForm({
        title: inquiry.title,
        content: inquiry.content,
      });
    }
    setAnonymousPassword(''); // 비밀번호 초기화
  };

  const handleSaveEdit = async () => {
    if (!inquiry || !id) return;

    if (!editForm.title.trim() || !editForm.content.trim()) {
      setError('제목과 내용을 모두 입력해주세요.');
      return;
    }

    // 🔧 익명 문의 수정 시 비밀번호 확인
    if (inquiry.anonymous_name && !anonymousPassword.trim()) {
      setError('익명 문의 수정을 위해 비밀번호를 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const requestData = {
        title: editForm.title,
        content: editForm.content,
        ...(inquiry.anonymous_name && {
          anonymous_password: anonymousPassword,
        }),
      };

      await axios.put(`/api/inquiries/${id}`, requestData);

      setInquiry({
        ...inquiry,
        title: editForm.title,
        content: editForm.content,
      });
      setEditMode(false);
      setAnonymousPassword('');
      setError(null);
    } catch (err: any) {
      console.error('Failed to update inquiry:', err);
      setError(
        err.response?.data?.error || '문의 수정 중 오류가 발생했습니다.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!id) return;

    // 🔧 익명 문의 삭제 시 비밀번호 확인
    if (inquiry?.anonymous_name && !anonymousPassword.trim()) {
      setError('익명 문의 삭제를 위해 비밀번호를 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      const requestData = inquiry?.anonymous_name
        ? { anonymous_password: anonymousPassword }
        : {};

      await axios.delete(`/api/inquiries/${id}`, { data: requestData });
      navigate('/inquiry');
    } catch (err: any) {
      console.error('Failed to delete inquiry:', err);
      setError(
        err.response?.data?.error || '문의 삭제 중 오류가 발생했습니다.'
      );
      setShowDeleteConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setAnonymousPassword(''); // 비밀번호 초기화
  };

  // 🔧 수정/삭제 권한 확인
  const canEditDelete = () => {
    if (!inquiry) return false;

    // 관리자는 모든 문의 수정/삭제 가능
    if (user?.isAdmin) return true;

    // 로그인 사용자 본인 문의
    if (isAuthenticated && inquiry.user_id === user?.id) return true;

    // 익명 문의는 비밀번호로 확인 (verifiedAnonymous 상태 또는 비밀번호 입력 필요)
    if (inquiry.anonymous_name) return true;

    return false;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  const formatNewlines = (text: string = '') => {
    if (!text) return null;
    return text.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        <br />
      </span>
    ));
  };

  // 🆕 작성자 표시 함수
  const getAuthorDisplay = () => {
    if (!inquiry) return '';
    if (inquiry.anonymous_name) {
      return inquiry.anonymous_name;
    }
    return inquiry.user_name || '****';
  };

  // 🆕 카테고리 표시 함수
  const getCategoryDisplay = () => {
    if (!inquiry) return '';
    return inquiry.category === 'catering' ? '단체주문 문의' : '일반 문의';
  };

  // 🆕 돌아갈 URL 결정
  const getReturnUrl = () => {
    if (inquiry?.category === 'catering') {
      return '/catering';
    }
    return '/inquiry';
  };

  return (
    <div className="inquiry-detail-container">
      <button className="back-button" onClick={() => navigate(getReturnUrl())}>
        <span className="back-icon">←</span>
        목록으로 돌아가기
      </button>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      ) : error ? (
        <div className="alert alert-error">{error}</div>
      ) : inquiry ? (
        <div className="content-paper">
          <div className="header-section">
            {editMode ? (
              <div className="edit-form">
                <input
                  type="text"
                  className="edit-title-input"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                />

                {/* 🆕 익명 문의 수정 시 비밀번호 입력 */}
                {inquiry.anonymous_name && (
                  <div className="anonymous-password-section">
                    <input
                      type="password"
                      className="anonymous-password-input"
                      placeholder="문의 작성 시 입력한 비밀번호"
                      value={anonymousPassword}
                      onChange={(e) => setAnonymousPassword(e.target.value)}
                    />
                  </div>
                )}

                <div className="edit-actions">
                  <button
                    className="save-button"
                    onClick={handleSaveEdit}
                    disabled={submitting}
                  >
                    {submitting ? '저장 중...' : '저장'}
                  </button>
                  <button
                    className="cancel-button"
                    onClick={handleCancelEdit}
                    disabled={submitting}
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="title-section">
                  <div className="inquiry-meta">
                    <span className="category-badge">
                      {getCategoryDisplay()}
                    </span>
                    <span className="author-info">
                      작성자: {getAuthorDisplay()}
                    </span>
                  </div>
                  <h1 className="inquiry-title">{inquiry.title}</h1>
                  {canEditDelete() && (
                    <div className="action-buttons">
                      <button className="edit-button" onClick={handleEdit}>
                        수정
                      </button>
                      <button className="delete-button" onClick={handleDelete}>
                        삭제
                      </button>
                    </div>
                  )}
                </div>
                <span
                  className={`status-chip ${
                    inquiry.status === 'answered'
                      ? 'status-answered'
                      : 'status-unanswered'
                  }`}
                >
                  {inquiry.status === 'answered' ? '답변 완료' : '미답변'}
                </span>
              </>
            )}
          </div>

          <p className="date-text">작성일: {formatDate(inquiry.created_at)}</p>

          <div className="question-card">
            <div className="question-content">
              {editMode ? (
                <textarea
                  className="edit-content-textarea"
                  value={editForm.content}
                  onChange={(e) =>
                    setEditForm({ ...editForm, content: e.target.value })
                  }
                  rows={10}
                />
              ) : (
                <div className="question-text">
                  {formatNewlines(inquiry.content)}
                </div>
              )}
            </div>
          </div>

          {inquiry.answer && (
            <>
              <hr className="divider" />

              <h2 className="answer-title">답변</h2>

              <p className="answer-date">
                답변일: {formatDate(inquiry.answered_at)}
              </p>

              <div className="answer-card">
                <div className="answer-content">
                  <div className="answer-text">
                    {formatNewlines(inquiry.answer)}
                  </div>
                </div>
              </div>

              {/* 🆕 결제 요청 정보 표시 */}
              {inquiry.payment_requested && (
                <div className="payment-request-info">
                  <h3>💳 결제 요청</h3>
                  <p>
                    요청 금액:{' '}
                    <strong>
                      {inquiry.payment_amount?.toLocaleString()}원
                    </strong>
                  </p>
                  {isAuthenticated ? (
                    <button
                      className="payment-button"
                      onClick={() => navigate(`/catering`)}
                    >
                      결제하기
                    </button>
                  ) : (
                    <p className="login-notice">
                      결제는 로그인 후 이용 가능합니다.
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="alert alert-warning">문의를 찾을 수 없습니다.</div>
      )}

      {/* 🆕 익명 문의 비밀번호 입력 모달 */}
      {showPasswordModal && (
        <div className="dialog-overlay">
          <div className="dialog">
            <div className="dialog-title">비밀번호 입력</div>
            <div className="dialog-content">
              <p>이 문의는 비밀번호로 보호되어 있습니다.</p>
              <p>문의 작성 시 입력한 비밀번호를 입력해주세요.</p>

              {passwordError && (
                <div className="alert alert-error">{passwordError}</div>
              )}

              <div className="form-group">
                <input
                  type="password"
                  className="form-control"
                  placeholder="비밀번호"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === 'Enter' && verifyAnonymousPassword()
                  }
                  autoFocus
                />
              </div>
            </div>
            <div className="dialog-actions">
              <button
                className="btn-cancel"
                onClick={() => navigate(getReturnUrl())}
              >
                취소
              </button>
              <button className="btn-submit" onClick={verifyAnonymousPassword}>
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔧 삭제 확인 다이얼로그 - 익명 비밀번호 지원 */}
      {showDeleteConfirm && (
        <div className="dialog-overlay">
          <div className="dialog">
            <div className="dialog-title">문의 삭제</div>
            <div className="dialog-content">
              <p>정말로 이 문의를 삭제하시겠습니까?</p>
              <p>삭제된 문의는 복구할 수 없습니다.</p>

              {/* 🆕 익명 문의 삭제 시 비밀번호 입력 */}
              {inquiry?.anonymous_name && (
                <div className="form-group">
                  <label className="form-label">비밀번호</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="문의 작성 시 입력한 비밀번호"
                    value={anonymousPassword}
                    onChange={(e) => setAnonymousPassword(e.target.value)}
                  />
                </div>
              )}
            </div>
            <div className="dialog-actions">
              <button
                className="btn-cancel"
                onClick={handleCancelDelete}
                disabled={submitting}
              >
                취소
              </button>
              <button
                className="btn-delete"
                onClick={handleConfirmDelete}
                disabled={submitting}
              >
                {submitting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InquiryDetail;

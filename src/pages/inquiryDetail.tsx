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
  const { user } = useAuth();
  const [inquiry, setInquiry] = useState<InquiryProps | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({ title: '', content: '' });
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

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
    } catch (err) {
      console.error('Failed to fetch inquiry:', err);
      setError('문의 정보를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
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
  };

  const handleSaveEdit = async () => {
    if (!inquiry || !id) return;

    if (!editForm.title.trim() || !editForm.content.trim()) {
      setError('제목과 내용을 모두 입력해주세요.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.put(`/api/inquiries/${id}`, {
        title: editForm.title,
        content: editForm.content,
      });

      setInquiry({
        ...inquiry,
        title: editForm.title,
        content: editForm.content,
      });
      setEditMode(false);
      setError(null);
    } catch (err) {
      console.error('Failed to update inquiry:', err);
      setError('문의 수정 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!id) return;

    setSubmitting(true);
    try {
      await axios.delete(`/api/inquiries/${id}`);
      navigate('/inquiry');
    } catch (err) {
      console.error('Failed to delete inquiry:', err);
      setError('문의 삭제 중 오류가 발생했습니다.');
      setShowDeleteConfirm(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const canEditDelete = () => {
    if (!inquiry || !user) return false;
    return user.isAdmin || inquiry.user_id === user.id;
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

  return (
    <div className="inquiry-detail-container">
      <button className="back-button" onClick={() => navigate('/inquiry')}>
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
            </>
          )}
        </div>
      ) : (
        <div className="alert alert-warning">문의를 찾을 수 없습니다.</div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {showDeleteConfirm && (
        <div className="dialog-overlay">
          <div className="dialog">
            <div className="dialog-title">문의 삭제</div>
            <div className="dialog-content">
              <p>정말로 이 문의를 삭제하시겠습니까?</p>
              <p>삭제된 문의는 복구할 수 없습니다.</p>
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

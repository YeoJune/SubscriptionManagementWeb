// src/pages/inquiryDetail.tsx
import React, { useState, useEffect } from 'react';
import './inquiryDetail.css';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { InquiryProps } from '../types';

const InquiryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inquiry, setInquiry] = useState<InquiryProps | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

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
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch inquiry:', err);
      setError('문의 정보를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
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
            <h1 className="inquiry-title">{inquiry.title}</h1>
            <span
              className={`status-chip ${
                inquiry.status === 'answered'
                  ? 'status-answered'
                  : 'status-unanswered'
              }`}
            >
              {inquiry.status === 'answered' ? '답변 완료' : '미답변'}
            </span>
          </div>

          <p className="date-text">작성일: {formatDate(inquiry.created_at)}</p>

          <div className="question-card">
            <div className="question-content">
              <div className="question-text">
                {formatNewlines(inquiry.content)}
              </div>
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
    </div>
  );
};

export default InquiryDetail;

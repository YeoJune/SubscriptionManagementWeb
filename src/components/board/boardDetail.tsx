// src/components/board/boardDetail.tsx
import './boardDetail.css';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useParams } from 'react-router-dom';

interface BoardDetailProps {
  id: number;
  type: 'normal' | 'faq';
  title: string;
  content?: string;
  question?: string;
  answer?: string;
  createdAt: Date;
  images?: string[]; // 다중 이미지 배열로 변경
}

const formatNewlines = (text: string = '') => {
  if (!text) return null;
  return text.split('\n').map((line, index) => (
    <span key={index}>
      {line}
      <br />
    </span>
  ));
};

const BoardDetail: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [board, setBoard] = useState<BoardDetailProps | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch board data by id
  useEffect(() => {
    if (!id) {
      setError('잘못된 접근입니다.');
      setLoading(false);
      return;
    }
    fetchBoardById(id);
  }, [id]);

  const fetchBoardById = async (id: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/notices/${id}`);
      const boardData = response.data;

      const transformedBoard: BoardDetailProps = {
        id: boardData.id,
        type: boardData.type,
        title: boardData.title,
        content: boardData.content,
        question: boardData.question,
        answer: boardData.answer,
        createdAt: new Date(boardData.created_at),
        images: boardData.images || [], // 다중 이미지 배열
      };

      setBoard(transformedBoard);
    } catch (err) {
      if (err) setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="board-container">
      <button className="back-button" onClick={() => navigate('/board')}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M19 12H5M5 12L12 19M5 12L12 5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        목록으로 돌아가기
      </button>

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <div className="loading-text">데이터를 불러오는 중...</div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {board && !loading && (
        <div className="board-card">
          <h1 className="board-title">{board.title}</h1>

          <div className="board-meta">
            {board.type === 'normal' ? '공지사항' : 'FAQ'} | 작성일:{' '}
            {board.createdAt.toLocaleDateString()}
          </div>

          {/* 다중 이미지가 있는 경우 표시 */}
          {board.images && board.images.length > 0 && (
            <div className="board-images">
              {board.images.map((imagePath, index) => (
                <div key={index} className="board-image">
                  <img src={imagePath} alt={`첨부 이미지 ${index + 1}`} />
                </div>
              ))}
            </div>
          )}

          <hr className="board-divider" />

          {board.type === 'normal' ? (
            <div className="board-content">{formatNewlines(board.content)}</div>
          ) : (
            <>
              <div className="faq-question">Q. {board.question}</div>
              <hr className="board-divider" />
              <div className="faq-answer">
                A. {formatNewlines(board.answer)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default BoardDetail;

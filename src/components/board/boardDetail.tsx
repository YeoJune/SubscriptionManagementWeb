// src/components/board/boardDetail.tsx
import '../../global.css';
import './boardDetail.css';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { DialogContentText } from '@mui/material';

interface BoardDetailProps {
  id: number;
  type: string;
  title: string;
  content: string;
  createdAt: Date;
}

const formatNewlines = (text: string) =>
  text.split('\n').map((line, index) => (
    <span key={index}>
      {line}
      <br />
    </span>
  ));

const BoardDetail: React.FC = () => {
  const navigate = useNavigate();

  const { id } = useParams<{ id: string }>();
  const [board, setBoard] = useState<BoardDetailProps | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch board data by id
  useEffect(() => {
    if (!id) {
      setBoard(null);
      return;
    }
    fetchBoardByid(id);
  }, [id]);

  // TODO: fetch board databy id
  const fetchBoardByid = async (id: string) => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/notices/${id}`);
      const boardData = response.data;

      const boardContent: string =
        boardData.type === 'normal'
          ? boardData.content
          : boardData.question + '\n\n' + boardData.answer;

      const transformedBoard: BoardDetailProps = {
        id: boardData.id,
        type: boardData.type, // 'type'을 boardType으로 매핑
        title: boardData.title,
        content: boardContent,
        createdAt: new Date(boardData.created_at),
      };

      setBoard(transformedBoard);
    } catch (_err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /*
  if (board) {
    return (
      <div className="board-container">
        <div className="board-header">
          <button
            onClick={() => window.history.back()}
            className="board-back-button small"
          >
            <ArrowBackIcon /> 뒤로 가기
          </button>
          <h1 className="board-title">{board.title}</h1>
          <p className="board-meta">
            작성일: {new Date(board.createdAt).toDateString()}
          </p>
        </div>
        <div className="board-content">
          <p>{board.content}</p>
        </div>
      </div>
    );
  } else {
    return (
      <div className="board-hero">
        <h1>404 Not Found</h1>
        <h3>게시글이 존재하지 않습니다.</h3>
        <button
          onClick={() => window.history.back()}
          className="board-back-button"
        >
          <ArrowBackIcon />
          뒤로 가기
        </button>
      </div>
    );
  }
  */

  // to be refactored by the following snippet
  return (
    <div className="board-container">
      {loading && <p>📦 데이터를 불러오는 중...</p>}
      {error && <p style={{ color: 'red' }}>⚠️ {error}</p>}
      {board && (
        <>
          <div className="board-header">
            <button
              onClick={() => navigate('/board')}
              className="board-back-button small"
            >
              <ArrowBackIcon /> 뒤로 가기
            </button>
            <h1 className="board-title">{board.title}</h1>
            <p className="board-meta">
              작성일: {new Date(board.createdAt).toDateString()}
            </p>
          </div>
          <DialogContentText>
            {board && formatNewlines(board.content)}
          </DialogContentText>
        </>
      )}
    </div>
  );
};

export default BoardDetail;

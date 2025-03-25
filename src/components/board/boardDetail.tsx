// src/components/board/boardDetail.tsx
import '../../global.css';
import './boardDetail.css';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  Typography,
  Divider,
  Button,
  CircularProgress,
} from '@mui/material';

interface BoardDetailProps {
  id: number;
  type: 'normal' | 'faq';
  title: string;
  content?: string;
  question?: string;
  answer?: string;
  createdAt: Date;
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
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/board')}
        sx={{ marginBottom: 2 }}
      >
        목록으로 돌아가기
      </Button>

      {loading && (
        <div className="loading-container">
          <CircularProgress />
          <Typography>데이터를 불러오는 중...</Typography>
        </div>
      )}

      {error && (
        <Typography color="error" variant="h6" align="center">
          {error}
        </Typography>
      )}

      {board && !loading && (
        <Card elevation={3}>
          <CardContent>
            <Typography variant="h5" component="h1" gutterBottom>
              {board.title}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              {board.type === 'normal' ? '공지사항' : 'FAQ'} | 작성일:{' '}
              {board.createdAt.toLocaleDateString()}
            </Typography>

            <Divider sx={{ my: 2 }} />

            {board.type === 'normal' ? (
              <Typography variant="body1" component="div">
                {formatNewlines(board.content)}
              </Typography>
            ) : (
              <>
                <Typography variant="h6" gutterBottom>
                  Q. {board.question}
                </Typography>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body1" component="div">
                  A. {formatNewlines(board.answer)}
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BoardDetail;

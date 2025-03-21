import React, { useEffect, useState } from 'react';
import axios from 'axios';
import BoardList from '../components/board/boardList';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { BoardProps } from '../types';
import './board.css';

const Board: React.FC = () => {
  const [boards, setBoards] = useState<BoardProps[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<BoardProps | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const response = await axios.get('/api/notices', {
        params: { page: 1, limit: 10 },
      });
      const notices = response.data.notices.map((notice: any) => ({
        id: notice.id,
        title: notice.title,
        content: notice.content || notice.answer, // Handle FAQ vs Normal Notices
        category: notice.type, // 'normal' or 'faq'
        createdAt: new Date(notice.created_at),
      }));
      setBoards(notices);
      setLoading(false);
    } catch (err) {
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleBoardClick = (board: BoardProps) => {
    setSelectedBoard(board);
  };

  const handleClose = () => {
    setSelectedBoard(null);
  };

  return (
    <div className="board-container">
      {loading && <p>📦 데이터를 불러오는 중...</p>}
      {error && <p style={{ color: 'red' }}>⚠️ {error}</p>}

      {!loading && !error && (
        <BoardList boards={boards} onBoardClick={handleBoardClick} />
      )}

      {/* MUI Dialog for selected board content */}
      <Dialog open={Boolean(selectedBoard)} onClose={handleClose} fullWidth maxWidth="md">
        {selectedBoard && (
          <>
            <DialogTitle>{selectedBoard.title}</DialogTitle>
            <DialogContent>
              <DialogContentText>{selectedBoard.content}</DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="primary">
                닫기
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </div>
  );
};

export default Board;

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

const PAGE_SIZE = 10; // Number of items per page

const Board: React.FC = () => {
  const [boards, setBoards] = useState<BoardProps[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<BoardProps | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  useEffect(() => {
    fetchBoards();
  }, [currentPage]); // Fetch data when `currentPage` changes

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/notices', {
        params: { page: currentPage, limit: PAGE_SIZE },
      });
      const notices = response.data.notices.map((notice: any) => ({
        id: notice.id,
        title: notice.title,
        content: notice.content || notice.answer,
        category: notice.type,
        createdAt: new Date(notice.created_at),
      }));
      setBoards(notices);
      
      // ✅ Ensure totalPages is always valid
      const total = response.data.total ?? 0; // Default to 0 if undefined
      setTotalPages(total > 0 ? Math.ceil(total / PAGE_SIZE) : 1); 
      
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

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  return (
    <div className="board-container">
      {loading && <p>📦 데이터를 불러오는 중...</p>}
      {error && <p style={{ color: 'red' }}>⚠️ {error}</p>}

      {!loading && !error && (
        <>
          <BoardList boards={boards} onBoardClick={handleBoardClick} />

          {/* Pagination Buttons */}
          <div className="pagination">
            <Button onClick={goToPreviousPage} disabled={currentPage === 1}>
              -
            </Button>
            {[...Array(totalPages)].map((_, index) => (
              <Button
                key={index + 1}
                onClick={() => setCurrentPage(index + 1)}
                variant={currentPage === index + 1 ? 'contained' : 'outlined'}
                style = {{
                  backgroundColor: currentPage === index + 1 ? '#4caf50' : 'transparent',
                  color: currentPage === index + 1 ? 'white' : '#9e9e9e',
                }}
              >
                {index + 1}
              </Button>
            ))}
            <Button onClick={goToNextPage} disabled={currentPage === totalPages}>
              +
            </Button>
          </div>
        </>
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

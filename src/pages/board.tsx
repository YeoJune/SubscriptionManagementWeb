// src/pages/board.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import BoardList from '../components/board/boardList';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import { Typography, Box, CircularProgress } from '@mui/material';
import { BoardProps } from '../types';
import './board.css';

const PAGE_SIZE = 10; // Number of items per page

const Board: React.FC = () => {
  const [boards, setBoards] = useState<BoardProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'normal' | 'faq'>('normal');
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoards();
  }, [currentPage, activeTab]); // Fetch data when `currentPage` or `activeTab` changes

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/notices', {
        params: {
          page: currentPage,
          limit: PAGE_SIZE,
          type: activeTab,
        },
      });

      const notices = response.data.notices.map((notice: any) => ({
        id: notice.id,
        title: notice.title,
        content: notice.content || '',
        type: notice.type,
        question: notice.question || '',
        answer: notice.answer || '',
        createdAt: new Date(notice.created_at),
      }));

      setBoards(notices);

      // Ensure totalPages is always valid
      const total = response.data.pagination?.total ?? 0;
      setTotalPages(total > 0 ? Math.ceil(total / PAGE_SIZE) : 1);

      setLoading(false);
    } catch (err) {
      if (err) setError('데이터를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleBoardClick = (board: BoardProps) => {
    navigate(`/board/${board.id}`);
  };

  const handleTabChange = (
    _: React.SyntheticEvent,
    newValue: 'normal' | 'faq'
  ) => {
    setActiveTab(newValue);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  return (
    <div className="board-container">
      <Typography variant="h4" component="h1" gutterBottom textAlign="center">
        공지사항
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange} centered>
          <Tab label="공지사항" value="normal" />
          <Tab label="FAQ" value="faq" />
        </Tabs>
      </Box>

      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Typography color="error" textAlign="center" my={4}>
          ⚠️ {error}
        </Typography>
      )}

      {!loading && !error && (
        <>
          <BoardList boards={boards} onBoardClick={handleBoardClick} />

          {/* Pagination Buttons */}
          <div className="pagination">
            <Button onClick={goToPreviousPage} disabled={currentPage === 1}>
              이전
            </Button>
            {totalPages <= 5 ? (
              // Show all pages if 5 or fewer
              [...Array(totalPages)].map((_, index) => (
                <Button
                  key={index + 1}
                  onClick={() => setCurrentPage(index + 1)}
                  variant={currentPage === index + 1 ? 'contained' : 'outlined'}
                  sx={{
                    mx: 0.5,
                    backgroundColor:
                      currentPage === index + 1 ? '#4caf50' : 'transparent',
                    color: currentPage === index + 1 ? 'white' : '#9e9e9e',
                  }}
                >
                  {index + 1}
                </Button>
              ))
            ) : (
              // Show limited page buttons with ellipsis for many pages
              <>
                {currentPage > 1 && (
                  <Button onClick={() => setCurrentPage(1)}>1</Button>
                )}
                {currentPage > 3 && <span>...</span>}

                {[...Array(5)].map((_, idx) => {
                  const pageNum = Math.max(2, currentPage - 2) + idx;
                  if (pageNum >= 2 && pageNum <= totalPages - 1) {
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        variant={
                          currentPage === pageNum ? 'contained' : 'outlined'
                        }
                        sx={{
                          mx: 0.5,
                          backgroundColor:
                            currentPage === pageNum ? '#4caf50' : 'transparent',
                          color: currentPage === pageNum ? 'white' : '#9e9e9e',
                        }}
                      >
                        {pageNum}
                      </Button>
                    );
                  }
                  return null;
                })}

                {currentPage < totalPages - 2 && <span>...</span>}
                {currentPage < totalPages && (
                  <Button onClick={() => setCurrentPage(totalPages)}>
                    {totalPages}
                  </Button>
                )}
              </>
            )}
            <Button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
            >
              다음
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default Board;

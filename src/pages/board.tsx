// src/pages/board.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import BoardList from '../components/board/boardList';
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
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleBoardClick = (board: BoardProps) => {
    navigate(`/board/${board.id}`);
  };

  const handleTabChange = (newValue: 'normal' | 'faq') => {
    setActiveTab(newValue);
    setCurrentPage(1); // Reset to first page when changing tabs
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const renderPageButtons = () => {
    if (totalPages <= 5) {
      // Show all pages if 5 or fewer
      return [...Array(totalPages)].map((_, index) => (
        <button
          key={index + 1}
          onClick={() => setCurrentPage(index + 1)}
          className={`page-button ${currentPage === index + 1 ? 'active' : ''}`}
        >
          {index + 1}
        </button>
      ));
    } else {
      // Show limited page buttons with ellipsis for many pages
      const buttons = [];

      // First page
      if (currentPage > 1) {
        buttons.push(
          <button
            key={1}
            onClick={() => setCurrentPage(1)}
            className="page-button"
          >
            1
          </button>
        );
      }

      // Ellipsis before current pages group
      if (currentPage > 3) {
        buttons.push(
          <span key="ellipsis1" className="ellipsis">
            ...
          </span>
        );
      }

      // Pages around current page
      for (let i = 0; i < 5; i++) {
        const pageNum = Math.max(2, currentPage - 2) + i;
        if (pageNum >= 2 && pageNum <= totalPages - 1) {
          buttons.push(
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              className={`page-button ${currentPage === pageNum ? 'active' : ''}`}
            >
              {pageNum}
            </button>
          );
        }
      }

      // Ellipsis after current pages group
      if (currentPage < totalPages - 2) {
        buttons.push(
          <span key="ellipsis2" className="ellipsis">
            ...
          </span>
        );
      }

      // Last page
      if (currentPage < totalPages) {
        buttons.push(
          <button
            key={totalPages}
            onClick={() => setCurrentPage(totalPages)}
            className="page-button"
          >
            {totalPages}
          </button>
        );
      }

      return buttons;
    }
  };

  return (
    <div className="board-container">
      <h1 className="page-title">공지사항</h1>

      <div className="tabs-container">
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'normal' ? 'active' : ''}`}
            onClick={() => handleTabChange('normal')}
          >
            공지사항
          </button>
          <button
            className={`tab ${activeTab === 'faq' ? 'active' : ''}`}
            onClick={() => handleTabChange('faq')}
          >
            FAQ
          </button>
        </div>
      </div>

      {loading && (
        <div className="loading">
          <div className="loading-spinner"></div>
        </div>
      )}

      {error && <div className="error-message">⚠️ {error}</div>}

      {!loading && !error && (
        <>
          <BoardList boards={boards} onBoardClick={handleBoardClick} />

          {/* Pagination Buttons */}
          <div className="pagination">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage === 1}
              className="nav-button"
            >
              이전
            </button>

            {renderPageButtons()}

            <button
              onClick={goToNextPage}
              disabled={currentPage === totalPages}
              className="nav-button"
            >
              다음
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Board;

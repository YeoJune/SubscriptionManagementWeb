// src/components/board/boardList.tsx
import React from 'react';
import './boardList.css';
import { BoardListProps } from '../../types';

const BoardList: React.FC<BoardListProps> = ({ boards, onBoardClick }) => {
  // 내용 길이 제한 함수
  const truncateContent = (content: string, maxLength: number = 50) => {
    if (!content) return '';
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  return (
    <div className="board-table-container">
      <table className="board-table">
        <thead className="board-table-head">
          <tr>
            <th>구분</th>
            <th>제목</th>
            <th className="board-content-column">내용</th>
            <th className="board-image-column">이미지</th>
            <th>작성일</th>
          </tr>
        </thead>
        <tbody className="board-table-body">
          {boards.length === 0 ? (
            <tr>
              <td colSpan={5} className="board-empty-message">
                게시글이 없습니다.
              </td>
            </tr>
          ) : (
            boards.map((board) => (
              <tr key={board.id} onClick={() => onBoardClick(board)}>
                <td>
                  <span
                    className={`board-chip ${board.type === 'normal' ? 'board-chip-primary' : 'board-chip-secondary'}`}
                  >
                    {board.type === 'normal' ? '공지' : 'FAQ'}
                  </span>
                </td>
                <td>{board.title}</td>
                <td className="board-content-column">
                  {board.type === 'normal'
                    ? truncateContent(board.content || '')
                    : truncateContent(board.question || '')}
                </td>
                <td className="board-image-column">
                  {board.images && board.images.length > 0 ? (
                    <div className="board-thumbnail-container">
                      <img
                        src={board.images[0]}
                        alt="첨부 이미지"
                        className="board-thumbnail"
                      />
                      {board.images.length > 1 && (
                        <span className="image-count-badge">
                          +{board.images.length - 1}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="no-image">없음</span>
                  )}
                </td>
                <td>
                  {board.createdAt instanceof Date
                    ? board.createdAt.toLocaleDateString()
                    : new Date(board.created_at || '').toLocaleDateString()}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default BoardList;

// src/components/board/boardList.tsx
import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { BoardListProps, BoardProps } from '../../types';
import { useNavigate } from 'react-router-dom';

const BoardList: React.FC<BoardListProps> = ({ boards }) => {
  const navigate = useNavigate();

  const handleBoardClick = (board: BoardProps) => {
    navigate(`/board/${board.id}`);
  };

  return (
    <TableContainer component={Paper} sx={{ maxWidth: 900, margin: '0 auto', marginTop: 4 }}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell align="center" colSpan={5} sx={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
              공지사항
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>제목</TableCell>
            <TableCell>내용</TableCell>
            <TableCell>작성자</TableCell>
            <TableCell>작성일</TableCell>
            <TableCell>공개 여부</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {boards.map((board) => (
            <TableRow key={board.id} onClick={() => handleBoardClick(board)} sx={{ cursor: 'pointer' }}>
              <TableCell>{board.title}</TableCell>
              <TableCell>{board.content}</TableCell>
              <TableCell>{board.author.name}</TableCell>
              <TableCell>{board.createdAt.toLocaleString()}</TableCell>
              <TableCell>{board.isPublic ? '공개' : '비공개'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
};

export default BoardList;


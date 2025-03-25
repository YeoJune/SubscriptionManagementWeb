// src/components/board/boardList.tsx
import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { BoardListProps } from '../../types';

const BoardList: React.FC<BoardListProps> = ({ boards, onBoardClick }) => {
  // 내용 길이 제한 함수
  const truncateContent = (content: string, maxLength: number = 50) => {
    if (content.length <= maxLength) return content;
    return content.slice(0, maxLength) + '...';
  };

  return (
    <TableContainer
      component={Paper}
      sx={{ maxWidth: 900, margin: '0 auto', marginTop: 2 }}
    >
      <Table>
        <TableHead>
          <TableRow>
            <TableCell width="15%">구분</TableCell>
            <TableCell width="40%">제목</TableCell>
            <TableCell width="30%">내용</TableCell>
            <TableCell width="15%">작성일</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {boards.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center">
                게시글이 없습니다.
              </TableCell>
            </TableRow>
          ) : (
            boards.map((board) => (
              <TableRow
                key={board.id}
                onClick={() => onBoardClick(board)}
                sx={{
                  cursor: 'pointer',
                  '&:hover': { backgroundColor: '#f5f5f5' },
                }}
              >
                <TableCell>
                  <Chip
                    label={board.type === 'normal' ? '공지' : 'FAQ'}
                    color={board.type === 'normal' ? 'primary' : 'secondary'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{board.title}</TableCell>
                <TableCell>
                  {board.type === 'normal'
                    ? truncateContent(board.content || '')
                    : truncateContent(board.question || '')}
                </TableCell>
                <TableCell>{board.createdAt.toLocaleDateString()}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default BoardList;

// src/pages/board.tsx
import BoardList from '../components/board/boardList';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import React, { useState } from 'react';
import { BoardListProps, BoardProps, UserProps } from '../types';
import './board.css';


// TODO: get users list from DB
const user: UserProps = {
  id: 1,
  name: "Yeo",
  email: "Yeo@korea.ac.kr",
  role: 'admin'
}

// TODO: get boards list from DB
const boards: BoardListProps = {
  boards: [
    {
      id: 1,
      title: "Hello, world!",
      content: "Hello, world!",
      author: user,
      category: 'notice',
      isPublic: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  ]
};

// TODO: Add a board component that will display the board list
const Board: React.FC = () => {
  const [selectedBoard, setSelectedBoard] = useState<BoardProps | null>(null);

  const handleBoardClick = (board: BoardProps) => {
    setSelectedBoard(board);
  }

  const handleClose = () => {
    setSelectedBoard(null);
  }

  return (
    <div className="board-container">
      {/* BoardList Component에 Click Handler 전달*/}
      <BoardList boards={boards.boards} onBoardClick={handleBoardClick} />

      {/* MUI Dialog로 선택된 게시글 내용 표시 */}
      <Dialog
        open={Boolean(selectedBoard)}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
      >
        {selectedBoard && (
          <>
            <DialogTitle>{selectedBoard.title}</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {selectedBoard.content}
              </DialogContentText>
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
  )
}

export default Board;


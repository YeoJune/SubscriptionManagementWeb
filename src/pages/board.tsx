// src/pages/board.tsx
import BoardList from '../components/board/boardList';
import './board.css';
import React from 'react';
import { BoardListProps, UserProps } from '../types';


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
  return (
    <div className="board-container">
      <BoardList boards={boards.boards} />
    </div>
  )
}

export default Board;


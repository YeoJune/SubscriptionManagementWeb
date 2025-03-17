// src/components/board/boardDetail.tsx
import '../../global.css';
import './boardDetail.css';
import React from 'react';
import { BoardProps } from '../../types';
import { dummyBoards } from './placeholder';
import { useParams } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const BoardDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // TODO: fetch board data by id
  // TODO: fetch board data from DB

  // example dummy data
  const boards = dummyBoards.boards;

  const board: BoardProps | undefined = boards.find((board) => board.id === Number(id));

  if (board) {
    return (
      <div className="board-container">
        <div className="board-header">
          <button onClick={() => window.history.back()} className="board-back-button small">
            <ArrowBackIcon /> 뒤로 가기
          </button>
          <h1 className="board-title">{board.title}</h1>
          <p className="board-meta">
            작성자: {board.author.name} | 작성일: {new Date(board.createdAt).toDateString()} | 공개 여부: {board.isPublic ? '공개' : '비공개'}
          </p>
        </div>
        <div className="board-content">
          <p>{board.content}</p>
        </div>
      </div>
    );
  } else {
    return (
      <div className="board-hero">
        <h1>404 Not Found</h1>
        <h3>게시글이 존재하지 않습니다.</h3>
        <button onClick={() => window.history.back()} className="board-back-button">
          <ArrowBackIcon />
          뒤로 가기
        </button>
      </div>
    );
  }
};

export default BoardDetail;

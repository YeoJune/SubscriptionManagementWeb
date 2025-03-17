import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from '../pages/home';
import Board from '../pages/board';
import NotFound from '../pages/notFound';
import BoardDetail from '../components/board/boardDetail';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/board" element={<Board />} />
      <Route path="/board/:id" element={<BoardDetail />} />
      <Route path="*" element={<NotFound />} /> {/* 404 Not Found */}
    </Routes>
  );
}

export default AppRoutes;

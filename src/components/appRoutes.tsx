import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Admin from '../pages/admin';
import Board from '../pages/board';
import BoardDetail from '../components/board/boardDetail';
import Home from '../pages/home';
import Login from '../pages/login';
import NotFound from '../pages/notFound';
import Register from '../pages/register';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/board" element={<Board />} />
      <Route path="/board/:id" element={<BoardDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="*" element={<NotFound />} /> {/* 404 Not Found */}
    </Routes>
  );
};

export default AppRoutes;

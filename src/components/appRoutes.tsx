import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Board from '../pages/board';
import BoardDetail from '../components/board/boardDetail';
import Home from '../pages/home';
import Login from '../pages/login';
import NotFound from '../pages/notFound';
import Subscription from '../pages/subscription';
import Register from '../pages/register';
import Users from '../components/admin/users';
import UserInfo from '../components/admin/userInfo';
import AdminIndex from '../pages/admin/adminIndex';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/board" element={<Board />} />
      <Route path="/board/:id" element={<BoardDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin" element={<AdminIndex />} />
      <Route path="/admin/users" element={<Users />} />
      <Route path="/admin/users/:id" element={<UserInfo />} />
      <Route path="/subscription" element={<Subscription />} />
      <Route path="*" element={<NotFound />} /> {/* 404 Not Found */}
    </Routes>
  );
};

export default AppRoutes;

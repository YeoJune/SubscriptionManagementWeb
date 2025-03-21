import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Board from '../pages/board';
import BoardDetail from '../components/board/boardDetail';
import Home from '../pages/home';
import Login from '../pages/login';
import NotFound from '../pages/notFound';
import Subscription from '../pages/subscription';
import Register from '../pages/register';
import Delivery from '../pages/admin/delivery';
import Profile from '../pages/profile';
import AdminIndex from '../pages/admin/adminIndex';
import AdminUsers from '../pages/admin/users';
import AdminUser from '../pages/admin/user';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/board" element={<Board />} />
      <Route path="/board/:id" element={<BoardDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/register" element={<Register />} />
      <Route path="/subscription" element={<Subscription />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminIndex />} />
      <Route path="/admin/delivery" element={<Delivery />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="/admin/users/:id" element={<AdminUser />} />
      <Route path="*" element={<NotFound />} /> {/* 404 Not Found */}
    </Routes>
  );
};

export default AppRoutes;

// src/components/appRoutes.tsx
import React, { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Board from '../pages/board';
import BoardDetail from '../components/board/boardDetail';
import Home from '../pages/home';
import Login from '../pages/login';
import NotFound from '../pages/notFound';
import Subscription from '../pages/subscription';
import Register from '../pages/register';
import Profile from '../pages/profile';
import Inquiry from '../pages/inquiry';
import InquiryDetail from '../pages/inquiryDetail';
import AdminIndex from '../pages/admin/adminIndex';
import AdminDelivery from '../pages/admin/delivery';
import AdminUsers from '../pages/admin/users';
import AdminInquiry from '../pages/admin/inquiry';
import AdminProducts from '../pages/admin/products';
import { useAuth } from '../hooks/useAuth';

const AppRoutes: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.isAdmin === true;

  // 보호된 라우트를 위한 래퍼 컴포넌트
  const ProtectedRoute = ({
    children,
    adminOnly = false,
  }: {
    children: ReactNode;
    adminOnly?: boolean;
  }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    if (adminOnly && !isAdmin) {
      return <Navigate to="/" replace />;
    }

    return <>{children}</>;
  };

  return (
    <Routes>
      {/* 공개 라우트 */}
      <Route path="/" element={<Home />} />
      <Route path="/board" element={<Board />} />
      <Route path="/board/:id" element={<BoardDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* 인증 필요 라우트 */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/subscription"
        element={
          <ProtectedRoute>
            <Subscription />
          </ProtectedRoute>
        }
      />

      <Route path="/inquiry" element={<Inquiry />} />
      <Route path="/inquiry/:id" element={<InquiryDetail />} />

      {/* 관리자 라우트 */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminIndex />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/delivery"
        element={
          <ProtectedRoute adminOnly>
            <AdminDelivery />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute adminOnly>
            <AdminUsers />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/inquiry"
        element={
          <ProtectedRoute adminOnly>
            <AdminInquiry />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/products"
        element={
          <ProtectedRoute adminOnly>
            <AdminProducts />
          </ProtectedRoute>
        }
      />

      {/* 404 페이지 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes;

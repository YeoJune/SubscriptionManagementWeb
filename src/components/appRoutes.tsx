// src/components/appRoutes.tsx
import React, { ReactNode, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Lazy 로드하는 컴포넌트
const Home = React.lazy(() => import('../pages/home'));
const BoardDetail = React.lazy(() => import('../components/board/boardDetail'));
const Login = React.lazy(() => import('../pages/login'));
const NotFound = React.lazy(() => import('../pages/notFound'));
const Subscription = React.lazy(() => import('../pages/subscription'));
const PaymentResult = React.lazy(() => import('../pages/PaymentResult'));
const Register = React.lazy(() => import('../pages/register'));
const Profile = React.lazy(() => import('../pages/profile'));
const Inquiry = React.lazy(() => import('../pages/inquiry'));
const InquiryDetail = React.lazy(() => import('../pages/inquiryDetail'));
const Catering = React.lazy(() => import('../pages/catering'));

// 관리자 페이지들
const AdminIndex = React.lazy(() => import('../pages/admin/adminIndex'));
const AdminDelivery = React.lazy(() => import('../pages/admin/delivery'));
const AdminUsers = React.lazy(() => import('../pages/admin/users'));
const AdminUserDetail = React.lazy(() => import('../pages/admin/userDetail')); // 사용자 상세 페이지 추가
const AdminInquiry = React.lazy(() => import('../pages/admin/inquiry'));
const AdminCateringInquiry = React.lazy(
  () => import('../pages/admin/cateringInquiry')
);
const AdminProducts = React.lazy(() => import('../pages/admin/products'));
const AdminNotices = React.lazy(() => import('../pages/admin/notices'));
const AdminPayments = React.lazy(() => import('../pages/admin/payments'));
const AdminHero = React.lazy(() => import('../pages/admin/hero'));

const AppRoutes: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const isAdmin = user?.isAdmin === true;

  // 로딩 컴포넌트
  const LoadingFallback = () => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '50vh',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid var(--primary-color)',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          marginBottom: '1rem',
        }}
      ></div>
      <p>로딩 중...</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

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
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* 공개 라우트 */}
        <Route path="/" element={<Home />} />
        {/* 공지사항을 홈으로 리다이렉트 */}
        <Route path="/board" element={<Navigate to="/" replace />} />
        <Route path="/board/:id" element={<BoardDetail />} />
        <Route path="/subscription" element={<Subscription />} />
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

        {/* 결제 결과 페이지 - 인증 필요 */}
        <Route
          path="/payment-result"
          element={
            <ProtectedRoute>
              <PaymentResult />
            </ProtectedRoute>
          }
        />

        <Route path="/inquiry" element={<Inquiry />} />
        <Route path="/inquiry/:id" element={<InquiryDetail />} />
        <Route path="/catering" element={<Catering />} />

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

        {/* 사용자 상세 페이지 라우트 추가 */}
        <Route
          path="/admin/users/:id"
          element={
            <ProtectedRoute adminOnly>
              <AdminUserDetail />
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
          path="/admin/catering"
          element={
            <ProtectedRoute adminOnly>
              <AdminCateringInquiry />
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

        <Route
          path="/admin/notices"
          element={
            <ProtectedRoute adminOnly>
              <AdminNotices />
            </ProtectedRoute>
          }
        />

        {/* 결제 관리 라우트 */}
        <Route
          path="/admin/payments"
          element={
            <ProtectedRoute adminOnly>
              <AdminPayments />
            </ProtectedRoute>
          }
        />

        {/* 히어로 관리 라우트 */}
        <Route
          path="/admin/hero"
          element={
            <ProtectedRoute adminOnly>
              <AdminHero />
            </ProtectedRoute>
          }
        />

        {/* 404 페이지 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;

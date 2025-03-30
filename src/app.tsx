// src/app.tsx
import './global.css';
import { AuthProvider } from './components/auth/authProvider';
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

// 동적 임포트
const AppRoutes = React.lazy(() => import('./components/appRoutes'));
const Header = React.lazy(() => import('./components/header'));
const Footer = React.lazy(() => import('./components/footer'));

const root = document.getElementById('root');

// 로딩 컴포넌트
const LoadingComponent = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      flexDirection: 'column',
    }}
  >
    <div
      style={{
        width: '50px',
        height: '50px',
        border: '5px solid #f3f3f3',
        borderTop: '5px solid var(--primary-color, #a4e22e)',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    ></div>
    <p style={{ marginTop: '1rem' }}>로딩 중...</p>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingComponent />}>
          <Header />
          <AppRoutes />
          <Footer />
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
};

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('❌ Root element not found');
}

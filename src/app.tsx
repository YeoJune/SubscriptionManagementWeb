// src/app.tsx
import './global.css';
import AppRoutes from './components/appRoutes';
import Footer from './components/footer';
import Header from './components/header';
import { AuthProvider } from './components/auth/authProvider';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

const root = document.getElementById('root');

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Header />
        <AppRoutes />
        <Footer />
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

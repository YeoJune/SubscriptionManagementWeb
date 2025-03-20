import AppRoutes from './components/appRoutes';
import Footer from './components/footer';
import Header from './components/header';
import { AuthProvider } from './components/auth/authProvider';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';

const root = document.getElementById('root');

const App: React.FC = () => {
  return (
    <Router basename="/">
      <AuthProvider>
        <Header />
        <AppRoutes />
        <Footer />
      </AuthProvider>
    </Router>
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

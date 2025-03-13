import AppRoutes from './components/appRoutes';
import Footer from './components/footer';
import Header from './components/header';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';

const root = document.getElementById('root');

// TODO: implement authentication
interface AuthContextType {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthContextType> = ({ children }) => {
  // TODO: implement authentication
  return <>{children}</>;
}

const App: React.FC = () => {
  return (
    <Router basename='/'>
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
  console.error("❌ Root element not found");
}

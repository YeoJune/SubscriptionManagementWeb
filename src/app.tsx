import AppRoutes from './components/appRoutes';
import Footer from './components/footer';
import Header from './components/header';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container!);

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
    <Router>
      <AuthProvider>
        <Header />
        <AppRoutes />
        <Footer />
      </AuthProvider>
    </Router>
  );
};

root.render(
  <App />
);


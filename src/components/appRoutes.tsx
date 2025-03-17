import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from '../pages/home';
import BoardProps from '../pages/board';
import NotFound from '../pages/notFound';

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/board" element={<BoardProps />} />
      <Route path="*" element={<NotFound />} /> {/* 404 Not Found */}
    </Routes>
  );
}

export default AppRoutes;

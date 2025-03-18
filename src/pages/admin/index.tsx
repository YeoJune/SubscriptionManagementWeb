// src/pages/admin/index.tsx
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import NotFound from '../notFound';

const Admin: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<div>Admin</div>} />
      <Route path="*" element={<NotFound />} /> {/* 404 Not Found */}
    </Routes>
  );
}

export default Admin;

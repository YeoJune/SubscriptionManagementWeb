import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import React from 'react';
import AdminIndex from '../../pages/admin/adminIndex';
import Users from '../../pages/admin/users';
import UserInfo from './userInfo';

const Admin: React.FC = () => {
  return (
    <Router basename="/admin">
      <Routes>
        <Route path="/" element={<AdminIndex />} />
        <Route path="/users" element={<Users />} />
        <Route path="/users/:id" element={<UserInfo />} />
      </Routes>
    </Router>
  );
};

export default Admin;

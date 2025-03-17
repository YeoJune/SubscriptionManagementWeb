// src/components/header.tsx
import '../global.css';
import './header.css';
import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link } from 'react-router-dom';

/* Deprecated
const Header: React.FC = () => {
  return (
    <header className="header">
      <nav className="header-container">
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/about">About</Link>
          </li>
          <li>
            <Link to="/board">Board</Link>
          </li>
        </ul>
      </nav>
    </header>
  );
}
*/
const Header: React.FC = () => {
  return (
    <AppBar position="static" sx={{ marginBottom: '1rem', backgroundColor: '#555' }}>
      <Toolbar sx={{ display: 'flex' }}>
        {/* 왼쪽 영역: 로고(또는 앱 타이틀) */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            Shopping Mall
          </Typography>
        </Box>

        {/* 중앙 영역: Home, Board 버튼 (정확히 중앙) */}
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 2 }}>
          <Button color="inherit" component={Link} to="/">
            Home
          </Button>
          <Button color="inherit" component={Link} to="/board">
            Board
          </Button>
        </Box>

        {/* 오른쪽 영역: Register, Login 버튼 */}
        <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
          <Button color="inherit" component={Link} to="/register">
            Register
          </Button>
          <Button color="inherit" component={Link} to="/login">
            Login
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;

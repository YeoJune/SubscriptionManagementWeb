// src/components/header.tsx
import '../global.css';
import './header.css';
import React, { useContext } from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Link } from 'react-router-dom';
import { AuthContext } from '../components/auth/authProvider';

const RightButtonLogin: React.ReactNode = (
  <>
    <Button color="inherit" component={Link} to="/register">
      회원가입
    </Button>
    <Button color="inherit" component={Link} to="/login">
      로그인
    </Button>
  </>
);

const RightButtonLogout = (logout: () => void): React.ReactNode => {
  return (
    <>
      <Button color="inherit" component={Link} to="/profile">
        회원정보
      </Button>
      <Button color="inherit" onClick={logout}>
        로그아웃
      </Button>
    </>
  );
};

const Header: React.FC = () => {
  const { isAuthenticated, logout } = useContext(AuthContext);

  return (
    <AppBar
      position="static"
      sx={{ marginBottom: '1rem', backgroundColor: '#555' }}
    >
      <Toolbar sx={{ display: 'flex' }}>
        {/* 왼쪽 영역: 로고(또는 앱 타이틀) */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <Typography variant="h6" component="div">
            Shopping Mall
          </Typography>
        </Box>

        {/* 중앙 영역: Home, Board 버튼 (정확히 중앙) */}
        <Box
          sx={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 2 }}
        >
          <Button color="inherit" component={Link} to="/">
            Home
          </Button>
          <Button color="inherit" component={Link} to="/board">
            Board
          </Button>
        </Box>

        {/* 오른쪽 영역: Register, Login 버튼 */}
        <Box
          sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 2 }}
        >
          {!isAuthenticated ? RightButtonLogin : RightButtonLogout(logout)}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;

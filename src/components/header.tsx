// src/components/header.tsx
import '../global.css';
import './header.css';
import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, Badge } from '@mui/material';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const isAdmin = user?.isAdmin;

  return (
    <AppBar
      position="static"
      sx={{ marginBottom: '1rem', backgroundColor: '#555' }}
    >
      <Toolbar sx={{ display: 'flex' }}>
        {/* 왼쪽 영역: 로고(또는 앱 타이틀) */}
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <Typography
            variant="h6"
            component={Link}
            to="/"
            sx={{ color: 'white', textDecoration: 'none' }}
          >
            배송 관리 시스템
          </Typography>
        </Box>

        {/* 중앙 영역: 네비게이션 메뉴 */}
        <Box
          sx={{ flex: 2, display: 'flex', justifyContent: 'center', gap: 2 }}
        >
          <Button color="inherit" component={Link} to="/">
            홈
          </Button>
          <Button color="inherit" component={Link} to="/board">
            공지사항
          </Button>
          {isAuthenticated && (
            <>
              <Button color="inherit" component={Link} to="/profile">
                내 프로필
              </Button>
              <Button color="inherit" component={Link} to="/subscription">
                구독/결제
              </Button>
              <Button color="inherit" component={Link} to="/inquiry">
                고객의 소리
              </Button>
            </>
          )}
          {isAdmin && (
            <Button
              color="inherit"
              component={Link}
              to="/admin"
              sx={{
                backgroundColor: 'primary.main',
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              }}
            >
              관리자
            </Button>
          )}
        </Box>

        {/* 오른쪽 영역: 로그인/로그아웃 버튼 */}
        <Box
          sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', gap: 2 }}
        >
          {!isAuthenticated ? (
            <>
              <Button color="inherit" component={Link} to="/register">
                회원가입
              </Button>
              <Button color="inherit" component={Link} to="/login">
                로그인
              </Button>
            </>
          ) : (
            <>
              {user?.delivery_count !== undefined &&
                user.delivery_count > 0 && (
                  <Badge
                    badgeContent={user.delivery_count}
                    color="error"
                    sx={{ alignSelf: 'center', mr: 1 }}
                  >
                    <Typography variant="body2">남은 배송</Typography>
                  </Badge>
                )}
              <Button color="inherit" onClick={logout}>
                로그아웃
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;

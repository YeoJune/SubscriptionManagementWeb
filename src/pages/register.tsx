// src/pages/register.tsx
import React from 'react';
import { Container, Box, Paper, Typography, TextField, Button } from '@mui/material';

const Register: React.FC = () => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // 여기에 회원가입 로직을 추가하세요.
  };

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
        sx={{ backgroundColor: '#f5f5f5' }} // 전체 배경은 연한 회색
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography
            variant="h4"
            component="h1"
            align="center"
            gutterBottom
            sx={{ color: 'grey.800' }} // 타이틀 회색 계열
          >
            회원가입
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="이름"
              variant="outlined"
              margin="normal"
              fullWidth
              required
            />
            <TextField
              label="이메일 주소"
              variant="outlined"
              margin="normal"
              fullWidth
              required
              type="email"
            />
            <TextField
              label="비밀번호"
              variant="outlined"
              margin="normal"
              fullWidth
              required
              type="password"
            />
            <TextField
              label="비밀번호 확인"
              variant="outlined"
              margin="normal"
              fullWidth
              required
              type="password"
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{
                marginTop: 2,
                backgroundColor: 'grey.700',
                ':hover': { backgroundColor: 'grey.800' }
              }}
            >
              회원가입
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;

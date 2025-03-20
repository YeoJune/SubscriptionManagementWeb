// src/pages/register.tsx
import React, { useState } from 'react';
import {
  Alert,
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Snackbar,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState<string | null>(null);
  const [passwordConfirm, setPasswordConfirm] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorSnackbar, setErrorSnackbar] = useState<string | null>(null);
  const [successSnackbar, setSuccessSnackbar] = useState<string | null>(null);

  // 실시간 에러 상태
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMatchError, setPasswordMatchError] = useState<string | null>(
    null
  );

  const handleSnackbarClose = () => {
    setErrorSnackbar(null);
    setSuccessSnackbar(null);
  };

  // 실시간 입력 검증
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (value.length === 0) {
      setNameError('이름을 입력해주세요');
    } else {
      setNameError(null);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError(value.includes('@') ? null : '이메일 형식이 아닙니다');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordError(
      value.length >= 8 ? null : '비밀번호는 8자 이상이어야 합니다'
    );
    // 입력 중에도 비밀번호 일치 여부 갱신
    setPasswordMatchError(
      passwordConfirm === value ? null : '비밀번호가 일치하지 않습니다'
    );
  };

  const handlePasswordConfirmChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setPasswordConfirm(value);
    setPasswordMatchError(
      password === value ? null : '비밀번호가 일치하지 않습니다'
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name || !email || !password || !passwordConfirm) {
      setErrorSnackbar('모든 항목을 입력해주세요');
      return;
    }

    if (emailError || passwordError || passwordMatchError) {
      setErrorSnackbar('입력값을 확인해주세요');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorSnackbar(data.message);
        setLoading(false);
        return;
      }

      setSuccessSnackbar(
        '회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.'
      );
      setTimeout(() => navigate('/login'), 1500);
    } catch (error: any) {
      setErrorSnackbar(error.message);
    } finally {
      setLoading(false);
    }
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
              value={name}
              onChange={handleNameChange}
              error={!!nameError}
            />
            {nameError && (
              <Typography color="error" variant="body2">
                {nameError}
              </Typography>
            )}

            <TextField
              label="이메일 주소"
              variant="outlined"
              margin="normal"
              fullWidth
              required
              type="email"
              value={email}
              onChange={handleEmailChange}
              error={!!emailError}
            />
            {emailError && (
              <Typography color="error" variant="body2">
                {emailError}
              </Typography>
            )}

            <TextField
              label="비밀번호"
              variant="outlined"
              margin="normal"
              fullWidth
              required
              type="password"
              value={password}
              onChange={handlePasswordChange}
              error={!!passwordError}
            />
            {passwordError && (
              <Typography color="error" variant="body2">
                {passwordError}
              </Typography>
            )}

            <TextField
              label="비밀번호 확인"
              variant="outlined"
              margin="normal"
              fullWidth
              required
              type="password"
              value={passwordConfirm}
              onChange={handlePasswordConfirmChange}
              error={!!passwordMatchError}
            />
            {passwordMatchError && (
              <Typography color="error" variant="body2">
                {passwordMatchError}
              </Typography>
            )}

            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{
                marginTop: 2,
                backgroundColor: 'grey.700',
                ':hover': { backgroundColor: 'grey.800' },
              }}
            >
              {loading ? '회원가입 중...' : '회원가입'}
            </Button>
          </form>
        </Paper>
      </Box>

      <Snackbar
        open={!!errorSnackbar || !!successSnackbar}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        {errorSnackbar ? (
          <Alert
            severity="error"
            onClose={handleSnackbarClose}
            sx={{ width: '100%' }}
          >
            {errorSnackbar}
          </Alert>
        ) : successSnackbar ? (
          <Alert
            severity="success"
            onClose={handleSnackbarClose}
            sx={{ width: '100%' }}
          >
            {successSnackbar}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Container>
  );
};

export default Register;

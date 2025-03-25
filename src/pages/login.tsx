// src/pages/login.tsx
import React, { useState } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Snackbar,
  Alert,
  Link as MuiLink,
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSnackbarClose = () => {
    setOpenSnackbar(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!id || !password) {
      setError('아이디와 비밀번호를 모두 입력해주세요.');
      setOpenSnackbar(true);
      return;
    }

    setLoading(true);
    const result = await login(id, password);
    setLoading(false);

    if (!result.success) {
      setError(result.message);
      setOpenSnackbar(true);
    } else {
      navigate('/');
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="calc(100vh - 100px)" // 헤더 높이 고려
        py={4}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            로그인
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="아이디"
              variant="outlined"
              margin="normal"
              fullWidth
              required
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
            <TextField
              label="비밀번호"
              variant="outlined"
              margin="normal"
              fullWidth
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={loading}
              sx={{
                marginTop: 3,
                backgroundColor: 'grey.700',
                ':hover': { backgroundColor: 'grey.800' },
              }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </Button>

            <Box mt={2} textAlign="center">
              <Typography variant="body2">
                계정이 없으신가요?{' '}
                <MuiLink component={Link} to="/register">
                  회원가입
                </MuiLink>
              </Typography>
            </Box>
          </form>
        </Paper>
      </Box>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={handleSnackbarClose}>
          {error}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Login;

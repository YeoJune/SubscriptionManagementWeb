// src/pages/login.tsx import React, { useState, useContext } from 'react';
import { AuthContext } from '../components/auth/authProvider';
import { Container, Box, Paper, Typography, TextField, Button } from '@mui/material';
import { Snackbar, Alert } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useState, useContext } from 'react';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
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
      setError('ID 또는 비밀번호를 입력해주세요.');
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
      navigate('/')
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <Paper elevation={3} style={{ padding: '2rem', width: '100%' }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            로그인
          </Typography>
          <form onSubmit={handleSubmit}>
            <TextField
              label="ID"
              variant="outlined"
              margin="normal"
              fullWidth
              required
              type="id"
              value={id}
              onChange={(e) => setId(e.target.value)}
            />
            <TextField
              label="Password"
              variant="outlined"
              margin="normal"
              fullWidth
              required
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Snackbar
              open={openSnackbar}
              autoHideDuration={3000}
              onClose={handleSnackbarClose}
              anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
              <Alert severity="error" sx={{ width: '100%' }}>
                {error}
              </Alert>
            </Snackbar>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              style={{ marginTop: '1rem' }}
              sx={{
                marginTop: 2,
                backgroundColor: 'grey.700',
                ':hover': { backgroundColor: 'grey.800' }
              }}
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;

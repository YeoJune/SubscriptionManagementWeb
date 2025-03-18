// src/pages/login.tsx
import React, { useState, useContext } from 'react';
import { Container, Box, Paper, Typography, TextField, Button } from '@mui/material';
import { AuthContext } from '../components/auth/authProvider';

const Login: React.FC = () => {
  const { login } = useContext(AuthContext);
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await login(id, password);
    } catch (error) {
      console.error("Login Failed", error);
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
            >
              Login
            </Button>
          </form>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;

// src/pages/login.tsx
import React from 'react';
import { Container, Box, Paper, Typography, TextField, Button } from '@mui/material';

const Login: React.FC = () => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // Add your login logic here, e.g., authentication calls.
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
              label="Email Address"
              variant="outlined"
              margin="normal"
              fullWidth
              required
              type="email"
            />
            <TextField
              label="Password"
              variant="outlined"
              margin="normal"
              fullWidth
              required
              type="password"
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

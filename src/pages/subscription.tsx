// src/pages/subscription.tsx
import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  CircularProgress,
  Alert,
  Box,
} from '@mui/material';

interface User {
  id: number;
  phone_number: string;
  delivery_count: number;
  isAdmin: boolean;
}

const Subscription: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth', {
      method: 'GET',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          // 에러 메시지를 추출하여 에러 상태로 설정합니다.
          return res.json().then((data) => {
            setError(data.error || '사용자 정보를 불러오지 못했습니다.');
            setLoading(false);
            return;
          });
        }
        return res.json();
      })
      .then((data) => {
        if (data) {
          setUser(data.user);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      {loading && (
        <Box display="flex" justifyContent="center" alignItems="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && user && (
        <>
          <Typography variant="h4" gutterBottom>
            Subscription Page
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            안녕하세요, 사용자 #{user.id}님
          </Typography>
          <Typography variant="body1">
            현재 구독(배송) 수: {user.delivery_count}
          </Typography>
        </>
      )}
    </Container>
  );
};

export default Subscription;

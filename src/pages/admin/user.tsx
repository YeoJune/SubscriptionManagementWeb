// pages/admin/user.tsx
import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  CircularProgress,
  Alert,
  Box,
  Paper,
} from '@mui/material';
import { useParams } from 'react-router-dom';

interface UserDetail {
  id: number;
  phone_number: string;
  delivery_count: number;
  isAdmin: boolean;
  // 필요에 따라 추가 필드들...
}

const AdminUser: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // URL 파라미터에서 id를 가져옵니다.
  const [userRaw, setUserRaw] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('사용자 ID가 유효하지 않습니다.');
      setLoading(false);
      return;
    }

    setLoading(true); fetch(`/api/users/${id}`, {
      method: 'GET',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            setError(data.error || '사용자 정보를 불러오지 못했습니다.');
            setLoading(false);
          });
        }
        return res.json();
      })
      .then((data: { user: UserDetail } | undefined) => {
        if (data) {
          setUserRaw(data);
          setLoading(false);
        }
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && userRaw && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            사용자 상세 정보
          </Typography>
          <Typography variant="subtitle1">ID: {userRaw.id}</Typography>
          <Typography variant="body1">
            전화번호: {userRaw.phone_number}
          </Typography>
          <Typography variant="body1">
            구독(배송) 수: {userRaw.delivery_count}
          </Typography>
          <Typography variant="body1">
            관리자 여부: {userRaw.isAdmin ? 'Yes' : 'No'}
          </Typography>
          {/* 추가 정보가 있다면 여기에 표시 */}
        </Paper>
      )}
    </Container>
  );
};

export default AdminUser;

// src/pages/profile.tsx
import React, { useState, useEffect } from 'react';
import './profile.css';
import {
  Container,
  Typography,
  Box,
  Divider,
  Card,
  CardContent,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import UserCard from '../components/userCard';
import axios from 'axios';
import { DeliveryProps } from '../types';

const Profile: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDeliveries();
    }
  }, [isAuthenticated]);

  const fetchDeliveries = async () => {
    try {
      const response = await axios.get('/api/delivery/my');
      setDeliveries(response.data.deliveries || []);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch deliveries:', err);
      setError('배송 정보를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  // 배송 상태별 색상 및 라벨
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { color: 'warning', label: '배송 대기' };
      case 'complete':
        return { color: 'success', label: '배송 완료' };
      case 'cancel':
        return { color: 'error', label: '배송 취소' };
      default:
        return { color: 'default', label: status };
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10 }}>
        <Alert severity="warning">로그인 후 접근 가능합니다.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 5, mb: 10 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        내 프로필
      </Typography>

      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <UserCard user={user} />
        </Grid>

        <Grid item xs={12} md={8}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                사용자 정보
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body1">
                  <strong>아이디:</strong> {user.id}
                </Typography>
                {user.name && (
                  <Typography variant="body1">
                    <strong>이름:</strong> {user.name}
                  </Typography>
                )}
                {user.phone_number && (
                  <Typography variant="body1">
                    <strong>전화번호:</strong> {user.phone_number}
                  </Typography>
                )}
                {user.email && (
                  <Typography variant="body1">
                    <strong>이메일:</strong> {user.email}
                  </Typography>
                )}
                {user.address && (
                  <Typography variant="body1">
                    <strong>주소:</strong> {user.address}
                  </Typography>
                )}
              </Box>

              <Typography
                variant="h6"
                color="primary"
                gutterBottom
                sx={{ mt: 3 }}
              >
                남은 배송 횟수: {user.delivery_count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Divider sx={{ my: 3 }} />

          <Typography variant="h5" component="h2" gutterBottom>
            배송 내역
          </Typography>

          {loading ? (
            <Box display="flex" justifyContent="center" my={4}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          ) : deliveries.length === 0 ? (
            <Alert severity="info" sx={{ mt: 2 }}>
              배송 내역이 없습니다.
            </Alert>
          ) : (
            <TableContainer component={Paper} elevation={3}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>배송일</TableCell>
                    <TableCell>상품</TableCell>
                    <TableCell align="center">상태</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deliveries.map((delivery) => {
                    const statusInfo = getStatusInfo(delivery.status);
                    return (
                      <TableRow key={delivery.id}>
                        <TableCell>
                          {new Date(delivery.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{delivery.product_name}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={statusInfo.label}
                            color={statusInfo.color as any}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default Profile;

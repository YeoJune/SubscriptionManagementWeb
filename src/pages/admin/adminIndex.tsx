// src/pages/admin/adminIndex.tsx
import React, { useState, useEffect } from 'react';
import './adminIndex.css';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CardActionArea,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import PeopleIcon from '@mui/icons-material/People';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import QuestionAnswerIcon from '@mui/icons-material/QuestionAnswer';
import axios from 'axios';

interface DashboardData {
  totalUsers: number;
  todayDeliveries: number;
  pendingInquiries: number;
  totalProducts: number;
}

const AdminIndex: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    totalUsers: 0,
    todayDeliveries: 0,
    pendingInquiries: 0,
    totalProducts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      fetchDashboardData();
    }
  }, [isAuthenticated, user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 여러 API 요청을 병렬로 처리
      const [
        usersResponse,
        deliveriesResponse,
        inquiriesResponse,
        productsResponse,
      ] = await Promise.all([
        axios.get('/api/users?limit=1'),
        axios.get('/api/delivery/today'),
        axios.get('/api/inquiries?status=unanswered&limit=1'),
        axios.get('/api/products?limit=1'),
      ]);

      setDashboardData({
        totalUsers: usersResponse.data.pagination.total || 0,
        todayDeliveries: deliveriesResponse.data.deliveries.length || 0,
        pendingInquiries: inquiriesResponse.data.pagination.total || 0,
        totalProducts: productsResponse.data.pagination.total || 0,
      });

      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('대시보드 데이터를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleCardClick = (path: string) => {
    navigate(path);
  };

  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10 }}>
        <Alert severity="error">접근 권한이 없습니다.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 5, mb: 10 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        관리자 대시보드
      </Typography>

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <>
          {/* 요약 데이터 카드 */}
          <Grid container spacing={3} sx={{ mb: 5 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 140,
                }}
              >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  전체 사용자
                </Typography>
                <Typography
                  component="div"
                  variant="h3"
                  sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}
                >
                  {dashboardData.totalUsers}
                  <PeopleIcon
                    sx={{ fontSize: 40, ml: 2, color: 'primary.main' }}
                  />
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 140,
                }}
              >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  당일 배송
                </Typography>
                <Typography
                  component="div"
                  variant="h3"
                  sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}
                >
                  {dashboardData.todayDeliveries}
                  <LocalShippingIcon
                    sx={{ fontSize: 40, ml: 2, color: 'success.main' }}
                  />
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 140,
                }}
              >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  미해결 문의
                </Typography>
                <Typography
                  component="div"
                  variant="h3"
                  sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}
                >
                  {dashboardData.pendingInquiries}
                  <QuestionAnswerIcon
                    sx={{ fontSize: 40, ml: 2, color: 'warning.main' }}
                  />
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper
                elevation={3}
                sx={{
                  p: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  height: 140,
                }}
              >
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  전체 상품
                </Typography>
                <Typography
                  component="div"
                  variant="h3"
                  sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}
                >
                  {dashboardData.totalProducts}
                  <InventoryIcon
                    sx={{ fontSize: 40, ml: 2, color: 'info.main' }}
                  />
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* 기능 카드 */}
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            관리 기능
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={3}>
                <CardActionArea
                  onClick={() => handleCardClick('/admin/delivery')}
                  sx={{ p: 2, height: 180 }}
                >
                  <CardContent>
                    <Box
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                      height="100%"
                    >
                      <LocalShippingIcon
                        sx={{ fontSize: 60, color: 'success.main', mb: 2 }}
                      />
                      <Typography variant="h6" align="center">
                        배송 관리
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={3}>
                <CardActionArea
                  onClick={() => handleCardClick('/admin/users')}
                  sx={{ p: 2, height: 180 }}
                >
                  <CardContent>
                    <Box
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                      height="100%"
                    >
                      <PeopleIcon
                        sx={{ fontSize: 60, color: 'primary.main', mb: 2 }}
                      />
                      <Typography variant="h6" align="center">
                        사용자 관리
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={3}>
                <CardActionArea
                  onClick={() => handleCardClick('/admin/products')}
                  sx={{ p: 2, height: 180 }}
                >
                  <CardContent>
                    <Box
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                      height="100%"
                    >
                      <InventoryIcon
                        sx={{ fontSize: 60, color: 'info.main', mb: 2 }}
                      />
                      <Typography variant="h6" align="center">
                        상품 관리
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Card elevation={3}>
                <CardActionArea
                  onClick={() => handleCardClick('/admin/inquiry')}
                  sx={{ p: 2, height: 180 }}
                >
                  <CardContent>
                    <Box
                      display="flex"
                      flexDirection="column"
                      alignItems="center"
                      justifyContent="center"
                      height="100%"
                    >
                      <QuestionAnswerIcon
                        sx={{ fontSize: 60, color: 'warning.main', mb: 2 }}
                      />
                      <Typography variant="h6" align="center">
                        고객의 소리
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Container>
  );
};

export default AdminIndex;

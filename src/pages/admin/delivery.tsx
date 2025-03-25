// src/pages/admin/delivery.tsx
import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  InputAdornment,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useAuth } from '../../hooks/useAuth';
import { DeliveryProps } from '../../types';
import axios from 'axios';

const Delivery: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [deliveries, setDeliveries] = useState<DeliveryProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDelivery, setSelectedDelivery] =
    useState<DeliveryProps | null>(null);
  const [statusToUpdate, setStatusToUpdate] = useState<'complete' | 'cancel'>(
    'complete'
  );

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      fetchDeliveries();
    }
  }, [page, rowsPerPage, filterStatus, filterDate]);

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
      };

      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (filterDate) {
        params.date = filterDate;
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await axios.get('/api/delivery', { params });

      setDeliveries(response.data.deliveries);
      setTotal(response.data.pagination?.total || 0);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch deliveries:', err);
      setError('배송 목록을 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(0);
    fetchDeliveries();
  };

  const handleOpenStatusDialog = (
    delivery: DeliveryProps,
    status: 'complete' | 'cancel'
  ) => {
    setSelectedDelivery(delivery);
    setStatusToUpdate(status);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedDelivery(null);
  };

  const handleUpdateStatus = async () => {
    if (!selectedDelivery) return;

    try {
      await axios.put(`/api/delivery/${selectedDelivery.id}`, {
        status: statusToUpdate,
      });

      handleCloseDialog();
      fetchDeliveries();
    } catch (err) {
      console.error('Failed to update delivery status:', err);
      setError('배송 상태 변경 중 오류가 발생했습니다.');
    }
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
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
        배송 관리
      </Typography>

      {/* 필터 및 검색 */}
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth>
              <InputLabel id="status-filter-label">배송 상태</InputLabel>
              <Select
                labelId="status-filter-label"
                value={filterStatus}
                label="배송 상태"
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(0);
                }}
              >
                <MenuItem value="all">전체</MenuItem>
                <MenuItem value="pending">배송 대기</MenuItem>
                <MenuItem value="complete">배송 완료</MenuItem>
                <MenuItem value="cancel">배송 취소</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={4} md={3}>
            <TextField
              fullWidth
              label="배송일 (YYYY-MM-DD)"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              placeholder="YYYY-MM-DD"
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          <Grid item xs={12} sm={4} md={4}>
            <TextField
              fullWidth
              label="검색"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleSearch} edge="end">
                      <SearchIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={2}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleSearch}
            >
              적용
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : deliveries.length === 0 ? (
        <Alert severity="info">배송 내역이 없습니다.</Alert>
      ) : (
        <>
          <TableContainer component={Paper} elevation={3}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>사용자</TableCell>
                  <TableCell>배송일</TableCell>
                  <TableCell>상품</TableCell>
                  <TableCell>연락처</TableCell>
                  <TableCell>주소</TableCell>
                  <TableCell align="center">상태</TableCell>
                  <TableCell align="center">액션</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deliveries.map((delivery) => {
                  const statusInfo = getStatusInfo(delivery.status);
                  return (
                    <TableRow key={delivery.id}>
                      <TableCell>{delivery.id}</TableCell>
                      <TableCell>
                        {delivery.user_name || delivery.user_id}
                      </TableCell>
                      <TableCell>
                        {new Date(delivery.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{delivery.product_name}</TableCell>
                      <TableCell>{delivery.phone_number}</TableCell>
                      <TableCell>{delivery.address}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={statusInfo.label}
                          color={statusInfo.color as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">
                        {delivery.status === 'pending' && (
                          <Box>
                            <Button
                              size="small"
                              color="success"
                              variant="outlined"
                              onClick={() =>
                                handleOpenStatusDialog(delivery, 'complete')
                              }
                              sx={{ mr: 1 }}
                            >
                              완료
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              variant="outlined"
                              onClick={() =>
                                handleOpenStatusDialog(delivery, 'cancel')
                              }
                            >
                              취소
                            </Button>
                          </Box>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 25, 50]}
            labelRowsPerPage="페이지당 행 수:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}-${to} / 전체 ${count !== -1 ? count : `${to} 이상`}`
            }
          />
        </>
      )}

      {/* 상태 변경 확인 다이얼로그 */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>배송 상태 변경 확인</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {`ID: ${selectedDelivery?.id}, 사용자: ${selectedDelivery?.user_name || selectedDelivery?.user_id}의 배송 상태를 `}
            <strong>{statusToUpdate === 'complete' ? '완료' : '취소'}</strong>로
            변경하시겠습니까?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            취소
          </Button>
          <Button
            onClick={handleUpdateStatus}
            color={statusToUpdate === 'complete' ? 'success' : 'error'}
            autoFocus
          >
            변경
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Delivery;

// src/components/shippingInfo.tsx
import React, { useState, useEffect } from 'react';
import './shippingInfo.css';
import {
  Typography,
  Paper,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Pagination,
  Chip,
} from '@mui/material';
import axios from 'axios';
import { DeliveryProps } from '../types';

interface PaginationData {
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
}

const ShippingInfo: React.FC = () => {
  const [deliveries, setDeliveries] = useState<DeliveryProps[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    fetchMyDeliveries();
  }, [page]);

  const fetchMyDeliveries = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/delivery/my', {
        params: { page, limit: 10 },
      });

      setDeliveries(response.data.deliveries);
      setPagination(response.data.pagination);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch deliveries:', err);
      setError('배송 내역을 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" my={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box width="100%">
      <Typography variant="h5" component="h2" gutterBottom>
        배송 내역
      </Typography>

      {deliveries.length === 0 ? (
        <Alert severity="info">배송 내역이 없습니다.</Alert>
      ) : (
        <>
          <TableContainer component={Paper} elevation={3}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>배송일</TableCell>
                  <TableCell>상품명</TableCell>
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

          {pagination && pagination.totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={2}>
              <Pagination
                count={pagination.totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default ShippingInfo;

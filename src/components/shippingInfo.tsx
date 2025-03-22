// src/components/shippingInfo.tsx
import React, { useState, useEffect } from 'react';
import {
  Container,
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
} from '@mui/material';

interface Delivery {
  id: number;
  status: string;
  date: string;
  product_id: number;
  product_name: string;
}

interface PaginationData {
  total: number;
  currentPage: number;
  totalPages: number;
  limit: number;
}

interface MyDeliveryResponse {
  deliveries: Delivery[];
  pagination: PaginationData;
}

const ShippingInfo: React.FC = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [page, setPage] = useState<number>(1);

  useEffect(() => {
    const fetchMyDeliveries = async () => {
      setLoading(true);
      try {
        // 개인 배송 목록 조회 API 호출 (기본 페이지: 1, 페이지당 항목 수: 10)
        const response = await fetch(`/api/delivery/my?page=${page}&limit=10`);
        if (!response.ok) {
          throw new Error('배송 내역을 불러오는 데 실패했습니다.');
        }
        const data: MyDeliveryResponse = await response.json();
        setDeliveries(data.deliveries);
        setPagination(data.pagination);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMyDeliveries();
  }, [page]);

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  if (loading) {
    return (
      <Container sx={{ textAlign: 'center', marginTop: '2rem' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container sx={{ marginTop: '2rem' }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ marginTop: '2rem' }}>
      <Typography variant="h4" component="h1" gutterBottom>
        내 배송 내역
      </Typography>
      {deliveries.length === 0 ? (
        <Typography variant="h6">배송 정보를 찾을 수 없습니다. </Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>배송 상태</TableCell>
                <TableCell>배송일</TableCell>
                <TableCell>제품명</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {deliveries.map((delivery) => (
                <TableRow key={delivery.id}>
                  <TableCell>{delivery.id}</TableCell>
                  <TableCell>{delivery.status}</TableCell>
                  <TableCell>{delivery.date}</TableCell>
                  <TableCell>{delivery.product_name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {deliveries.length != 0 && pagination && (
        <Box display="flex" justifyContent="center" mt={2}>
          <Pagination
            count={pagination.totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}
    </Container>
  );
};

export default ShippingInfo;

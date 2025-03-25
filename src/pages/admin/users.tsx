// pages/admin/users.tsx
import React, { useEffect, useState } from 'react';
import {
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Pagination,
  CircularProgress,
  Alert,
  Typography,
  Box,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth'; // useAuth 훅 추가

interface User {
  id: number;
  phone_number: string;
  delivery_count: number;
  isAdmin: boolean;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
}

interface ApiResponse {
  users: User[];
  pagination: PaginationInfo;
}

const AdminUsers: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(1);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth(); // 인증 상태 확인

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      // 관리자인 경우에만 데이터 로드
      fetchUsers();
    }
  }, [page, isAuthenticated, user]);

  const fetchUsers = () => {
    setLoading(true);
    fetch(`/api/users?page=${page}`, {
      method: 'GET',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || '사용자 정보를 불러오지 못했습니다.');
        }
        return res.json();
      })
      .then((data: ApiResponse) => {
        setUsers(data.users);
        setPagination(data.pagination);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  // 사용자 행 클릭 시 상세 페이지로 이동
  const handleRowClick = (id: number) => {
    navigate(`/admin/users/${id}`);
  };

  // 인증 및 권한 검사
  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10 }}>
        <Alert severity="error">접근 권한이 없습니다.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Typography variant="h4" gutterBottom>
        사용자 관리
      </Typography>

      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>전화번호</TableCell>
                  <TableCell>구독(배송) 수</TableCell>
                  <TableCell>관리자 여부</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => handleRowClick(user.id)}
                  >
                    <TableCell>{user.id}</TableCell>
                    <TableCell>{user.phone_number}</TableCell>
                    <TableCell>{user.delivery_count}</TableCell>
                    <TableCell>{user.isAdmin ? 'Yes' : 'No'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box display="flex" justifyContent="center" my={2}>
            <Pagination
              count={pagination.totalPages}
              page={pagination.currentPage}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        </>
      )}
    </Container>
  );
};

export default AdminUsers;

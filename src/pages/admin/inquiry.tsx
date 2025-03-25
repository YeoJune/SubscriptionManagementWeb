// src/pages/admin/inquiry.tsx
import React, { useState, useEffect } from 'react';
import './inquiry.css';
import axios from 'axios';
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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  CircularProgress,
  Alert,
  InputAdornment,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { InquiryProps } from '../../types';
import { useAuth } from '../../hooks/useAuth';

const AdminInquiry: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [inquiries, setInquiries] = useState<InquiryProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryProps | null>(
    null
  );
  const [openDialog, setOpenDialog] = useState(false);
  const [answer, setAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    if (isAuthenticated && user?.isAdmin) {
      fetchInquiries();
    }
  }, [page, rowsPerPage, filterStatus]);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: page + 1,
        limit: rowsPerPage,
      };

      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }

      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await axios.get('/api/inquiries', { params });

      setInquiries(response.data.inquiries);
      setTotal(response.data.pagination?.total || 0);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
      setError('문의 내역을 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleRowClick = (inquiry: InquiryProps) => {
    setSelectedInquiry(inquiry);
    setAnswer(inquiry.answer || '');
    setOpenDialog(true);
    setDialogError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedInquiry(null);
    setAnswer('');
    setDialogError(null);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedInquiry) return;

    if (!answer.trim()) {
      setDialogError('답변 내용을 입력해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      await axios.put(`/api/inquiries/${selectedInquiry.id}`, {
        answer,
      });

      handleCloseDialog();
      fetchInquiries();
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setDialogError('답변 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
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

  const handleSearch = () => {
    setPage(0);
    fetchInquiries();
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setPage(0);
    // 검색어 초기화 후 자동으로 재검색
    setTimeout(() => fetchInquiries(), 0);
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
        고객의 소리 관리
      </Typography>

      <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="status-filter-label">상태</InputLabel>
          <Select
            labelId="status-filter-label"
            value={filterStatus}
            label="상태"
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="all">전체</MenuItem>
            <MenuItem value="unanswered">미답변</MenuItem>
            <MenuItem value="answered">답변완료</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label="검색"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                {searchTerm && (
                  <IconButton onClick={handleClearSearch} edge="end">
                    <ClearIcon />
                  </IconButton>
                )}
                <IconButton onClick={handleSearch} edge="end">
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : inquiries.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          문의 내역이 없습니다.
        </Alert>
      ) : (
        <>
          <TableContainer component={Paper} elevation={3}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>제목</TableCell>
                  <TableCell>사용자</TableCell>
                  <TableCell>작성일</TableCell>
                  <TableCell align="center">상태</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inquiries.map((inquiry) => (
                  <TableRow
                    key={inquiry.id}
                    onClick={() => handleRowClick(inquiry)}
                    sx={{
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: '#f5f5f5' },
                    }}
                  >
                    <TableCell>{inquiry.id}</TableCell>
                    <TableCell>{inquiry.title}</TableCell>
                    <TableCell>
                      {inquiry.user_name || inquiry.user_id}
                    </TableCell>
                    <TableCell>
                      {new Date(inquiry.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={
                          inquiry.status === 'answered' ? '답변완료' : '미답변'
                        }
                        color={
                          inquiry.status === 'answered' ? 'success' : 'warning'
                        }
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
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

      {/* 답변 다이얼로그 */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedInquiry && (
          <>
            <DialogTitle>문의 답변 - {selectedInquiry.title}</DialogTitle>
            <DialogContent>
              {dialogError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {dialogError}
                </Alert>
              )}

              <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                작성자: {selectedInquiry.user_name || selectedInquiry.user_id}
              </Typography>

              <Typography variant="subtitle2" gutterBottom>
                작성일: {new Date(selectedInquiry.created_at).toLocaleString()}
              </Typography>

              <Paper
                variant="outlined"
                sx={{ p: 2, mt: 2, mb: 3, backgroundColor: '#f9f9f9' }}
              >
                <Typography
                  variant="body1"
                  component="div"
                  sx={{ whiteSpace: 'pre-wrap' }}
                >
                  {selectedInquiry.content}
                </Typography>
              </Paper>

              <TextField
                label="답변"
                multiline
                rows={8}
                fullWidth
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="답변을 입력해주세요"
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCloseDialog} disabled={submitting}>
                취소
              </Button>
              <Button
                onClick={handleSubmitAnswer}
                variant="contained"
                color="primary"
                disabled={submitting}
              >
                {submitting ? '저장 중...' : '답변 저장'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Container>
  );
};

export default AdminInquiry;

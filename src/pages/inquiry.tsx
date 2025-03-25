// src/pages/inquiry.tsx
import React, { useEffect, useState } from 'react';
import './inquiry.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { InquiryProps } from '../types';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  CircularProgress,
  Chip,
  Pagination,
  Alert,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const PAGE_SIZE = 10;

const Inquiry: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [inquiries, setInquiries] = useState<InquiryProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [newInquiry, setNewInquiry] = useState({ title: '', content: '' });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchInquiries();
  }, [currentPage]);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/inquiries', {
        params: { page: currentPage, limit: PAGE_SIZE },
      });

      setInquiries(response.data.inquiries);

      const total = response.data.pagination?.total ?? 0;
      setTotalPages(Math.ceil(total / PAGE_SIZE) || 1);

      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch inquiries:', err);
      setError('문의 내역을 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleInquiryClick = (inquiry: InquiryProps) => {
    navigate(`/inquiry/${inquiry.id}`);
  };

  const handleOpenDialog = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setOpenDialog(true);
    setDialogError(null);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setNewInquiry({ title: '', content: '' });
    setDialogError(null);
  };

  const handleSubmitInquiry = async () => {
    if (!newInquiry.title.trim()) {
      setDialogError('제목을 입력해주세요.');
      return;
    }

    if (!newInquiry.content.trim()) {
      setDialogError('내용을 입력해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      await axios.post('/api/inquiries', {
        title: newInquiry.title,
        content: newInquiry.content,
      });

      handleCloseDialog();
      fetchInquiries();
    } catch (err) {
      console.error('Failed to submit inquiry:', err);
      setDialogError('문의 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    setCurrentPage(value);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 5, mb: 10 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" component="h1">
          고객의 소리
        </Typography>

        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenDialog}
        >
          문의 등록
        </Button>
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
          등록된 문의가 없습니다.
        </Alert>
      ) : (
        <TableContainer component={Paper} elevation={3} sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>제목</TableCell>
                <TableCell>작성일</TableCell>
                <TableCell align="center">상태</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {inquiries.map((inquiry) => (
                <TableRow
                  key={inquiry.id}
                  onClick={() => handleInquiryClick(inquiry)}
                  sx={{
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: '#f5f5f5' },
                  }}
                >
                  <TableCell>{inquiry.title}</TableCell>
                  <TableCell>
                    {new Date(inquiry.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={
                        inquiry.status === 'answered' ? '답변 완료' : '미답변'
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
      )}

      {/* Pagination */}
      {!loading && !error && inquiries.length > 0 && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}

      {/* New Inquiry Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>새 문의 등록</DialogTitle>
        <DialogContent>
          {dialogError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dialogError}
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="제목"
            fullWidth
            value={newInquiry.title}
            onChange={(e) =>
              setNewInquiry({ ...newInquiry, title: e.target.value })
            }
            sx={{ mb: 2 }}
          />
          <TextField
            label="내용"
            multiline
            rows={5}
            fullWidth
            value={newInquiry.content}
            onChange={(e) =>
              setNewInquiry({ ...newInquiry, content: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} disabled={submitting}>
            취소
          </Button>
          <Button
            onClick={handleSubmitInquiry}
            variant="contained"
            disabled={submitting}
          >
            {submitting ? '등록 중...' : '등록'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Inquiry;

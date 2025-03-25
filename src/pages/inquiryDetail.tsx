// src/pages/inquiryDetail.tsx
import React, { useState, useEffect } from 'react';
import './inquiryDetail.css';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { InquiryProps } from '../types';
import {
  Container,
  Typography,
  Box,
  Paper,
  Divider,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const InquiryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [inquiry, setInquiry] = useState<InquiryProps | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('유효하지 않은 문의 ID입니다.');
      setLoading(false);
      return;
    }
    fetchInquiry(id);
  }, [id]);

  const fetchInquiry = async (inquiryId: string) => {
    try {
      const response = await axios.get(`/api/inquiries/${inquiryId}`);
      setInquiry(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch inquiry:', err);
      setError('문의 정보를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  const formatNewlines = (text: string = '') => {
    if (!text) return null;
    return text.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        <br />
      </span>
    ));
  };

  return (
    <Container maxWidth="md" sx={{ mt: 5, mb: 10 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/inquiry')}
        sx={{ mb: 3 }}
      >
        목록으로 돌아가기
      </Button>

      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : inquiry ? (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h5" component="h1">
              {inquiry.title}
            </Typography>
            <Chip
              label={inquiry.status === 'answered' ? '답변 완료' : '미답변'}
              color={inquiry.status === 'answered' ? 'success' : 'warning'}
            />
          </Box>

          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            mb={3}
          >
            작성일: {formatDate(inquiry.created_at)}
          </Typography>

          <Card variant="outlined" sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="body1" component="div">
                {formatNewlines(inquiry.content)}
              </Typography>
            </CardContent>
          </Card>

          {inquiry.answer && (
            <>
              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom color="primary">
                답변
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mb={2}
              >
                답변일: {formatDate(inquiry.answered_at)}
              </Typography>

              <Card variant="outlined">
                <CardContent>
                  <Typography variant="body1" component="div">
                    {formatNewlines(inquiry.answer)}
                  </Typography>
                </CardContent>
              </Card>
            </>
          )}
        </Paper>
      ) : (
        <Alert severity="warning" sx={{ mt: 2 }}>
          문의를 찾을 수 없습니다.
        </Alert>
      )}
    </Container>
  );
};

export default InquiryDetail;

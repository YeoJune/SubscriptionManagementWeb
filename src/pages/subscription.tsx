// src/pages/subscription.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Divider,
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ProductProps } from '../types';

// 단계를 3단계로 변경 (배송 일정 선택 단계 제거)
const steps = ['상품 선택', '결제 정보 입력', '확인'];

const Subscription: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [products, setProducts] = useState<ProductProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductProps | null>(
    null
  );
  // 배송 일정 관련 상태 제거
  const [paymentInfo, setPaymentInfo] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      fetchProducts();
    }
  }, [isAuthenticated, navigate]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data.products);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      setError('상품 정보를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedProduct) {
      setError('상품을 선택해주세요.');
      return;
    }

    if (activeStep === 1) {
      // 결제 정보 검증
      if (!validatePaymentInfo()) {
        return;
      }
    }

    setError(null);
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSelectProduct = (product: ProductProps) => {
    setSelectedProduct(product);
    setError(null);
  };

  const handlePaymentInfoChange =
    (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setPaymentInfo({
        ...paymentInfo,
        [field]: event.target.value,
      });
    };

  const validatePaymentInfo = () => {
    if (!paymentInfo.cardNumber.trim()) {
      setError('카드 번호를 입력해주세요.');
      return false;
    }

    if (!paymentInfo.cardName.trim()) {
      setError('카드 소유자 이름을 입력해주세요.');
      return false;
    }

    if (!paymentInfo.expiryDate.trim()) {
      setError('유효 기간을 입력해주세요.');
      return false;
    }

    if (!paymentInfo.cvv.trim()) {
      setError('CVV를 입력해주세요.');
      return false;
    }

    return true;
  };

  const handleSubmitPayment = async () => {
    if (!selectedProduct) {
      setError('선택 정보가 유효하지 않습니다.');
      return;
    }

    setProcessingPayment(true);

    try {
      // API 호출 수정: product_id만 전송
      await axios.post('/api/payments', {
        product_id: selectedProduct.id,
      });

      setPaymentSuccess(true);
      // 5초 후 홈페이지로 이동
      setTimeout(() => {
        navigate('/');
      }, 5000);
    } catch (err) {
      console.error('Payment failed:', err);
      setError('결제 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              상품 선택
            </Typography>

            {loading ? (
              <Box display="flex" justifyContent="center" my={4}>
                <CircularProgress />
              </Box>
            ) : products.length === 0 ? (
              <Alert severity="info">등록된 상품이 없습니다.</Alert>
            ) : (
              <Grid container spacing={3}>
                {products.map((product) => (
                  <Grid item xs={12} md={6} key={product.id}>
                    <Card
                      elevation={selectedProduct?.id === product.id ? 8 : 3}
                      sx={{
                        cursor: 'pointer',
                        border:
                          selectedProduct?.id === product.id
                            ? '2px solid #4caf50'
                            : 'none',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          transform: 'translateY(-5px)',
                          boxShadow: '0 8px 16px 0 rgba(0,0,0,0.2)',
                        },
                      }}
                      onClick={() => handleSelectProduct(product)}
                    >
                      <CardContent>
                        <Typography variant="h5" component="div" gutterBottom>
                          {product.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 2 }}
                        >
                          {product.description}
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {product.price.toLocaleString()}원
                        </Typography>
                        {/* 배송 횟수 정보 표시 */}
                        <Typography
                          variant="subtitle2"
                          color="text.secondary"
                          sx={{ mt: 1 }}
                        >
                          포함 배송 횟수: {product.delivery_count}회
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          color="primary"
                          variant={
                            selectedProduct?.id === product.id
                              ? 'contained'
                              : 'outlined'
                          }
                        >
                          {selectedProduct?.id === product.id
                            ? '선택됨'
                            : '선택하기'}
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              결제 정보 입력
            </Typography>

            <Paper elevation={3} sx={{ p: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    label="카드 번호"
                    value={paymentInfo.cardNumber}
                    onChange={handlePaymentInfoChange('cardNumber')}
                    fullWidth
                    placeholder="1234 5678 9012 3456"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="카드 소유자 이름"
                    value={paymentInfo.cardName}
                    onChange={handlePaymentInfoChange('cardName')}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="유효 기간 (MM/YY)"
                    value={paymentInfo.expiryDate}
                    onChange={handlePaymentInfoChange('expiryDate')}
                    fullWidth
                    placeholder="MM/YY"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="CVV"
                    value={paymentInfo.cvv}
                    onChange={handlePaymentInfoChange('cvv')}
                    fullWidth
                    type="password"
                  />
                </Grid>
              </Grid>
            </Paper>

            <Box mt={3}>
              <Typography variant="h6" gutterBottom>
                주문 요약
              </Typography>
              <Paper elevation={2} sx={{ p: 2 }}>
                <Typography>
                  <strong>상품:</strong> {selectedProduct?.name}
                </Typography>
                <Typography>
                  <strong>포함 배송 횟수:</strong>{' '}
                  {selectedProduct?.delivery_count}회
                </Typography>
                <Typography>
                  <strong>배송 날짜:</strong> 결제 완료 후 월/수/금 기준으로
                  자동 생성됩니다.
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="h6" color="primary">
                  <strong>총 금액:</strong>{' '}
                  {selectedProduct ? selectedProduct.price.toLocaleString() : 0}
                  원
                </Typography>
              </Paper>
            </Box>
          </Box>
        );
      case 2:
        return (
          <Box>
            {paymentSuccess ? (
              <Alert severity="success" sx={{ mb: 3 }}>
                결제가 완료되었습니다! 5초 후 홈페이지로 이동합니다.
              </Alert>
            ) : (
              <>
                <Typography variant="h6" gutterBottom>
                  주문 확인
                </Typography>

                <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    <strong>상품 정보</strong>
                  </Typography>
                  <Typography>
                    <strong>상품명:</strong> {selectedProduct?.name}
                  </Typography>
                  <Typography>
                    <strong>설명:</strong> {selectedProduct?.description}
                  </Typography>
                  <Typography>
                    <strong>가격:</strong>{' '}
                    {selectedProduct?.price.toLocaleString()}원
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle1" gutterBottom>
                    <strong>배송 정보</strong>
                  </Typography>
                  <Typography>
                    <strong>배송 횟수:</strong>{' '}
                    {selectedProduct?.delivery_count}회
                  </Typography>
                  <Typography>
                    <strong>배송 일정:</strong> 결제 완료 후 월/수/금 기준으로
                    자동 생성됩니다.
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle1" gutterBottom>
                    <strong>결제 정보</strong>
                  </Typography>
                  <Typography>
                    <strong>카드 번호:</strong> **** **** ****{' '}
                    {paymentInfo.cardNumber.slice(-4)}
                  </Typography>
                  <Typography>
                    <strong>카드 소유자:</strong> {paymentInfo.cardName}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="h6" color="primary">
                    <strong>총 결제 금액:</strong>{' '}
                    {selectedProduct
                      ? selectedProduct.price.toLocaleString()
                      : 0}
                    원
                  </Typography>
                </Paper>

                <Box display="flex" justifyContent="center">
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleSubmitPayment}
                    disabled={processingPayment}
                    sx={{ minWidth: 200 }}
                  >
                    {processingPayment ? (
                      <CircularProgress size={24} />
                    ) : (
                      '결제하기'
                    )}
                  </Button>
                </Box>
              </>
            )}
          </Box>
        );
      default:
        return '알 수 없는 단계';
    }
  };

  if (!isAuthenticated) {
    return (
      <Container maxWidth="sm" sx={{ mt: 10 }}>
        <Alert severity="warning">로그인 후 이용 가능합니다.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 5, mb: 10 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        구독/결제
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 3 }}>
        {getStepContent(activeStep)}

        <Box mt={4} display="flex" justifyContent="space-between">
          <Button disabled={activeStep === 0} onClick={handleBack}>
            이전
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={activeStep === steps.length - 1 ? undefined : handleNext}
            disabled={loading || processingPayment}
          >
            {activeStep === steps.length - 1 ? '완료' : '다음'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Subscription;

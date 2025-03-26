// src/pages/subscription.tsx
import React, { useState, useEffect } from 'react';
import './subscription.css';
import axios from 'axios';
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
      // API 호출: product_id만 전송
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

  // 상품 선택 스텝 렌더링
  const renderProductSelection = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      );
    }

    if (products.length === 0) {
      return <div className="alert alert-warning">등록된 상품이 없습니다.</div>;
    }

    return (
      <div className="product-grid">
        {products.map((product) => (
          <div
            key={product.id}
            className={`product-card ${selectedProduct?.id === product.id ? 'selected' : ''}`}
            onClick={() => handleSelectProduct(product)}
          >
            <div className="product-content">
              <h3 className="product-name">{product.name}</h3>
              <p className="product-description">{product.description}</p>
              <p className="product-price">
                {product.price.toLocaleString()}원
              </p>
              <div className="product-delivery-count">
                포함 배송 횟수: {product.delivery_count}회
              </div>
            </div>
            <div className="product-actions">
              <button
                className={`select-button ${selectedProduct?.id === product.id ? 'selected' : ''}`}
              >
                {selectedProduct?.id === product.id ? '선택됨' : '선택하기'}
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 결제 정보 입력 스텝 렌더링
  const renderPaymentForm = () => {
    return (
      <>
        <div className="payment-form">
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="cardNumber" className="form-label">
                카드 번호
              </label>
              <input
                id="cardNumber"
                type="text"
                className="form-control"
                value={paymentInfo.cardNumber}
                onChange={handlePaymentInfoChange('cardNumber')}
                placeholder="1234 5678 9012 3456"
              />
            </div>
            <div className="form-group full-width">
              <label htmlFor="cardName" className="form-label">
                카드 소유자 이름
              </label>
              <input
                id="cardName"
                type="text"
                className="form-control"
                value={paymentInfo.cardName}
                onChange={handlePaymentInfoChange('cardName')}
              />
            </div>
            <div className="form-group">
              <label htmlFor="expiryDate" className="form-label">
                유효 기간 (MM/YY)
              </label>
              <input
                id="expiryDate"
                type="text"
                className="form-control"
                value={paymentInfo.expiryDate}
                onChange={handlePaymentInfoChange('expiryDate')}
                placeholder="MM/YY"
              />
            </div>
            <div className="form-group">
              <label htmlFor="cvv" className="form-label">
                CVV
              </label>
              <input
                id="cvv"
                type="password"
                className="form-control"
                value={paymentInfo.cvv}
                onChange={handlePaymentInfoChange('cvv')}
                maxLength={3}
              />
            </div>
          </div>
        </div>

        <div className="order-summary">
          <h3 className="summary-title">주문 요약</h3>
          <div className="summary-content">
            <p className="summary-item">
              <strong>상품:</strong> {selectedProduct?.name}
            </p>
            <p className="summary-item">
              <strong>포함 배송 횟수:</strong> {selectedProduct?.delivery_count}
              회
            </p>
            <p className="summary-item">
              <strong>배송 날짜:</strong> 결제 완료 후 월/수/금 기준으로 자동
              생성됩니다.
            </p>
            <hr className="divider" />
            <p className="total-amount">
              <strong>총 금액:</strong>{' '}
              {selectedProduct ? selectedProduct.price.toLocaleString() : 0}원
            </p>
          </div>
        </div>
      </>
    );
  };

  // 확인 스텝 렌더링
  const renderConfirmation = () => {
    if (paymentSuccess) {
      return (
        <div className="alert alert-success">
          결제가 완료되었습니다! 5초 후 홈페이지로 이동합니다.
        </div>
      );
    }

    return (
      <>
        <div className="confirmation-section">
          <h3 className="section-title">주문 확인</h3>
          <div className="summary-content">
            <h4>상품 정보</h4>
            <p className="summary-item">
              <strong>상품명:</strong> {selectedProduct?.name}
            </p>
            <p className="summary-item">
              <strong>설명:</strong> {selectedProduct?.description}
            </p>
            <p className="summary-item">
              <strong>가격:</strong> {selectedProduct?.price.toLocaleString()}원
            </p>

            <hr className="divider" />

            <h4>배송 정보</h4>
            <p className="summary-item">
              <strong>배송 횟수:</strong> {selectedProduct?.delivery_count}회
            </p>
            <p className="summary-item">
              <strong>배송 일정:</strong> 결제 완료 후 월/수/금 기준으로 자동
              생성됩니다.
            </p>

            <hr className="divider" />

            <h4>결제 정보</h4>
            <p className="summary-item">
              <strong>카드 번호:</strong> **** **** ****{' '}
              {paymentInfo.cardNumber.slice(-4)}
            </p>
            <p className="summary-item">
              <strong>카드 소유자:</strong> {paymentInfo.cardName}
            </p>

            <hr className="divider" />

            <p className="total-amount">
              <strong>총 결제 금액:</strong>{' '}
              {selectedProduct ? selectedProduct.price.toLocaleString() : 0}원
            </p>
          </div>
        </div>

        <div className="center-container">
          <button
            className="payment-button"
            onClick={handleSubmitPayment}
            disabled={processingPayment}
          >
            {processingPayment ? (
              <div
                className="loading-spinner"
                style={{ width: '20px', height: '20px' }}
              ></div>
            ) : (
              '결제하기'
            )}
          </button>
        </div>
      </>
    );
  };

  // 각 스텝에 맞는 컨텐츠 렌더링
  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <div>
            <h2 className="step-title">상품 선택</h2>
            {renderProductSelection()}
          </div>
        );
      case 1:
        return (
          <div>
            <h2 className="step-title">결제 정보 입력</h2>
            {renderPaymentForm()}
          </div>
        );
      case 2:
        return <div>{renderConfirmation()}</div>;
      default:
        return '알 수 없는 단계';
    }
  };

  // 커스텀 스테퍼 렌더링
  const renderStepper = () => {
    return (
      <div className="stepper">
        {steps.map((label, index) => (
          <div
            key={label}
            className={`step ${index === activeStep ? 'active' : ''} ${index < activeStep ? 'completed' : ''}`}
          >
            <div className="step-icon">
              {index < activeStep ? '✓' : index + 1}
            </div>
            <div className="step-label">{label}</div>
          </div>
        ))}
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="subscription-container">
        <div className="alert alert-warning">로그인 후 이용 가능합니다.</div>
      </div>
    );
  }

  return (
    <div className="subscription-container">
      <h1 className="subscription-title">구독/결제</h1>

      {renderStepper()}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="content-paper">
        {getStepContent(activeStep)}

        <div className="navigation-buttons">
          <button
            className="back-button"
            disabled={activeStep === 0}
            onClick={handleBack}
          >
            이전
          </button>
          <button
            className="next-button"
            onClick={activeStep === steps.length - 1 ? undefined : handleNext}
            disabled={
              loading || processingPayment || activeStep === steps.length - 1
            }
          >
            {activeStep === steps.length - 1 ? '완료' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Subscription;

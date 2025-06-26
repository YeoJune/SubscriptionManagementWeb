// src/pages/subscription.tsx
import React, { useState, useEffect } from 'react';
import './subscription.css';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { ProductProps } from '../types';

// 나이스페이 SDK 타입 정의
declare global {
  interface Window {
    AUTHNICE?: {
      requestPay: (params: NicePayParams) => void;
    };
  }
}

interface NicePayParams {
  clientId: string;
  method: string;
  orderId: string;
  amount: number;
  goodsName: string;
  returnUrl: string;
  timestamp: string;
  signature: string;
  fnError?: (result: { errorMsg: string }) => void;
}

// 단계를 2단계로 변경 (결제 정보 입력 단계 제거)
const steps = ['상품 선택', '주문 확인'];

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
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      fetchProducts();
      loadNicePaySDK();
    }
  }, [isAuthenticated, navigate]);

  // 나이스페이 SDK 로드
  const loadNicePaySDK = () => {
    if (window.AUTHNICE) {
      return; // 이미 로드됨
    }

    const script = document.createElement('script');
    script.src = 'https://pay.nicepay.co.kr/v1/js/';
    script.async = true;
    script.onload = () => {
      console.log('NICE Pay SDK 로드 완료');
    };
    script.onerror = () => {
      console.error('NICE Pay SDK 로드 실패');
      setError('결제 시스템을 불러오는 중 오류가 발생했습니다.');
    };
    document.head.appendChild(script);
  };

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

  // 나이스페이 결제 요청
  const requestNicePayment = (paymentData: NicePayParams) => {
    if (!window.AUTHNICE) {
      setError('결제 시스템이 준비되지 않았습니다. 페이지를 새로고침해주세요.');
      setProcessingPayment(false);
      return;
    }

    window.AUTHNICE.requestPay({
      ...paymentData,
      fnError: (result) => {
        console.error('나이스페이 결제 에러:', result.errorMsg);
        setError(
          `결제 처리 중 오류가 발생했습니다: ${result.errorMsg || '알 수 없는 오류'}`
        );
        setProcessingPayment(false);
      },
    });
  };

  const handleSubmitPayment = async () => {
    if (!selectedProduct) {
      setError('선택 정보가 유효하지 않습니다.');
      return;
    }

    setProcessingPayment(true);
    setError(null);

    try {
      // 1단계: 결제 준비 API 호출
      const prepareResponse = await axios.post('/api/payments/prepare', {
        product_id: selectedProduct.id,
      });

      if (!prepareResponse.data.success) {
        throw new Error(
          prepareResponse.data.error || '결제 준비 중 오류가 발생했습니다.'
        );
      }

      const { paramsForNicePaySDK } = prepareResponse.data;

      // 2단계: 나이스페이 결제창 호출
      requestNicePayment(paramsForNicePaySDK);

      // 결제창이 열린 후 결과는 returnUrl에서 처리됨
      // payment-result 페이지로 이동하게 됨
    } catch (err: any) {
      console.error('Payment preparation failed:', err);
      setError(err.message || '결제 준비 중 오류가 발생했습니다.');
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

  // 주문 확인 스텝 렌더링 (결제 정보 입력 단계 제거됨)
  const renderOrderConfirmation = () => {
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

            <h4>결제 방법</h4>
            <p className="summary-item">
              <strong>결제 수단:</strong> 신용카드 (나이스페이)
            </p>
            <p className="summary-item text-muted">
              결제하기 버튼을 클릭하면 안전한 나이스페이 결제창이 열립니다.
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
              '안전결제 진행하기'
            )}
          </button>
          <p className="payment-notice">
            클릭 시 나이스페이 안전결제창이 열립니다
          </p>
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
            <h2 className="step-title">주문 확인</h2>
            {renderOrderConfirmation()}
          </div>
        );
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
            {activeStep === steps.length - 1 ? '결제 진행' : '다음'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Subscription;

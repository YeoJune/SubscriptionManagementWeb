// src/pages/subscription.tsx
import React, { useState, useEffect } from 'react';
import './subscription.css';
import axios from 'axios';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';
import { ProductProps } from '../types';
import DeliveryCalendar from '../components/DeliveryCalendar';

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

const steps = ['상품 선택', '배송일 선택', '주문 확인'];

const Subscription: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  const [activeStep, setActiveStep] = useState(0);
  const [products, setProducts] = useState<ProductProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductProps | null>(
    null
  );
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [specialRequest, setSpecialRequest] = useState<string>('');

  // 이미지 모달 관련 상태
  const [selectedImageForView, setSelectedImageForView] = useState<
    string | null
  >(null);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    fetchProducts();
    loadNicePaySDK();

    // 빠른 주문 처리 (로그인 여부와 관계없이)
    const searchParams = new URLSearchParams(location.search);
    const productId = searchParams.get('productId');
    if (productId && products.length > 0) {
      const product = products.find(
        (p: ProductProps) => p.id === parseInt(productId)
      );
      if (product) {
        setSelectedProduct(product);
        // 로그인된 사용자만 바로 다음 단계로
        if (isAuthenticated) {
          setActiveStep(1);
        }
      }
    }
  }, [location.search, products.length]);

  // ESC 키로 모달 닫기
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showImageModal) {
        handleCloseImageModal();
      }
    };

    if (showImageModal) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // 스크롤 방지
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [showImageModal]);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/products');
      const productsList = response.data.products || [];
      setProducts(productsList);
      setLoading(false);
    } catch (err) {
      console.error('상품 조회 실패:', err);
      setError('상품 정보를 불러오는 중 오류가 발생했습니다.');
      setLoading(false);
    }
  };

  const loadNicePaySDK = () => {
    if (window.AUTHNICE) return;

    const script = document.createElement('script');
    script.src = 'https://pay.nicepay.co.kr/v1/js/';
    script.async = true;
    script.onload = () => console.log('NICE Pay SDK 로드 완료');
    script.onerror = () => setError('결제 시스템 로드 실패');
    document.head.appendChild(script);
  };

  // 로그인 체크 함수
  const checkAuthenticationForOrder = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (activeStep === 0 && !selectedProduct) {
      setError('상품을 선택해주세요.');
      return;
    }

    // 상품 선택에서 배송일 선택으로 넘어갈 때 로그인 체크
    if (activeStep === 0) {
      if (!checkAuthenticationForOrder()) return;
    }

    // 배송일 선택은 선택사항으로 변경 (전체 개수를 선택하지 않아도 진행 가능)
    if (activeStep === 1) {
      // 선택한 날짜가 있다면, 상품의 배송 횟수와 동일해야 함
      if (
        selectedDates.length > 0 &&
        selectedDates.length !== selectedProduct?.delivery_count
      ) {
        setError(
          `배송일을 선택하려면 ${selectedProduct?.delivery_count}개의 날짜를 모두 선택해주세요. (또는 건너뛰기)`
        );
        return;
      }
    }

    setError(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSelectProduct = (product: ProductProps) => {
    setSelectedProduct(product);
    setSelectedDates([]);
    setError(null);
  };

  // 이미지 클릭 핸들러
  const handleImageClick = (imagePath: string, event: React.MouseEvent) => {
    event.stopPropagation(); // 상품 선택 이벤트와 분리
    setSelectedImageForView(imagePath);
    setShowImageModal(true);
  };

  // 이미지 모달 닫기
  const handleCloseImageModal = () => {
    setShowImageModal(false);
    setSelectedImageForView(null);
  };

  const handleSubmitPayment = async () => {
    if (!selectedProduct) return;

    setProcessingPayment(true);
    setError(null);

    try {
      const prepareResponse = await axios.post('/api/payments/prepare', {
        product_id: selectedProduct.id,
        special_request: specialRequest.trim() || null,
      });

      if (!prepareResponse.data.success) {
        throw new Error(prepareResponse.data.error || '결제 준비 실패');
      }

      // 선택된 날짜와 요청사항을 세션에 저장
      sessionStorage.setItem('selectedDates', JSON.stringify(selectedDates));
      sessionStorage.setItem('specialRequest', specialRequest.trim() || '');

      const { paramsForNicePaySDK } = prepareResponse.data;

      if (!window.AUTHNICE) {
        throw new Error('결제 시스템이 준비되지 않았습니다.');
      }

      window.AUTHNICE.requestPay({
        ...paramsForNicePaySDK,
        fnError: (result) => {
          setError(`결제 오류: ${result.errorMsg || '알 수 없는 오류'}`);
          setProcessingPayment(false);
        },
      });
    } catch (err: any) {
      setError(err.message || '결제 준비 중 오류 발생');
      setProcessingPayment(false);
    }
  };

  // 이미지 모달 렌더링
  const renderImageModal = () => {
    if (!showImageModal || !selectedImageForView) return null;

    return (
      <div className="image-modal-overlay" onClick={handleCloseImageModal}>
        <div className="image-modal-container">
          <button
            className="image-modal-close"
            onClick={handleCloseImageModal}
            aria-label="이미지 닫기"
          >
            ×
          </button>
          <img
            src={selectedImageForView}
            alt="식단표 확대 보기"
            className="image-modal-content"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    );
  };

  // 상품 선택 렌더링
  const renderProductSelection = () => {
    if (loading) {
      return (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>상품 정보를 불러오는 중...</p>
        </div>
      );
    }

    if (products.length === 0) {
      return <div className="alert alert-warning">등록된 상품이 없습니다.</div>;
    }

    return (
      <div>
        {!isAuthenticated && (
          <div className="login-notice">
            <p>
              🔍 식단표는 누구나 볼 수 있습니다. 주문하려면 로그인이 필요해요!
            </p>
            <button className="login-button" onClick={() => navigate('/login')}>
              로그인하기
            </button>
          </div>
        )}

        <div className="product-grid">
          {products.map((product) => (
            <div
              key={product.id}
              className={`product-card ${selectedProduct?.id === product.id ? 'selected' : ''}`}
              onClick={() => handleSelectProduct(product)}
            >
              <div className="product-image-container">
                {product.image_path ? (
                  <img
                    src={product.image_path}
                    alt={product.name}
                    className="product-image"
                    onClick={(e) => handleImageClick(product.image_path, e)}
                    title="클릭하면 크게 볼 수 있습니다"
                  />
                ) : (
                  <div className="product-image-placeholder">
                    <span className="placeholder-icon">🍱</span>
                  </div>
                )}
                {product.image_path && (
                  <div
                    className="image-zoom-hint"
                    onClick={(e) => handleImageClick(product.image_path, e)}
                  >
                    🔍 크게보기
                  </div>
                )}
              </div>
              <div className="product-content">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-description">{product.description}</p>
                <p className="product-price">
                  {product.price.toLocaleString()}원
                </p>
                <div className="product-delivery-count">
                  배송 횟수: {product.delivery_count}회
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
      </div>
    );
  };

  // 배송일 선택 렌더링
  const renderDeliveryDateSelection = () => {
    if (!selectedProduct) return null;

    return (
      <div>
        <div className="delivery-selection-info">
          <p>
            <strong>{selectedProduct.name}</strong>의 배송일을 선택해주세요.
          </p>
          <p>
            총 <strong>{selectedProduct.delivery_count}회</strong> 배송이
            시작됩니다. 원하시는 배송일을 선택해주세요. 총{' '}
            {selectedProduct.delivery_count}회 이내에서 60일이내
            자유선택하실수있습니다.
          </p>
        </div>
        <DeliveryCalendar
          requiredCount={selectedProduct.delivery_count}
          selectedDates={selectedDates}
          onDatesChange={setSelectedDates}
        />
        {selectedDates.length > 0 &&
          selectedDates.length < selectedProduct.delivery_count && (
            <div className="partial-selection-notice">
              <p>
                현재 {selectedDates.length}/{selectedProduct.delivery_count}개
                선택됨
              </p>
            </div>
          )}
      </div>
    );
  };

  // 주문 확인 렌더링
  const renderOrderConfirmation = () => {
    const searchParams = new URLSearchParams(location.search);
    const isQuickOrder = searchParams.get('productId');

    return (
      <>
        {isQuickOrder && (
          <div className="quick-order-notice">
            ⚡ 빠른 주문으로 선택된 상품입니다
          </div>
        )}

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

            {selectedDates.length > 0 ? (
              <div className="selected-dates-summary">
                <strong>선택한 배송일:</strong>
                <div className="dates-list">
                  {selectedDates.map((date) => (
                    <span key={date} className="date-item">
                      {new Date(date).toLocaleDateString('ko-KR')}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="summary-item">
                <strong>배송 일정:</strong> 자동 스케줄링 (월/수/금)
              </p>
            )}

            <hr className="divider" />

            <h4>요청사항</h4>
            <div className="special-request-section">
              <textarea
                className="special-request-input"
                placeholder="배송 시 요청사항이 있으시면 입력해 주세요. (선택사항)"
                value={specialRequest}
                onChange={(e) => setSpecialRequest(e.target.value)}
                maxLength={500}
                rows={4}
              />
              <div className="char-count">{specialRequest.length}/500</div>
            </div>

            <hr className="divider" />

            <p className="total-amount">
              <strong>총 결제 금액:</strong>{' '}
              {selectedProduct?.price.toLocaleString()}원
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

  // 스텝 컨텐츠
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
            <h2 className="step-title">배송일 선택</h2>
            {renderDeliveryDateSelection()}
          </div>
        );
      case 2:
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

  // 스테퍼 렌더링
  const renderStepper = () => {
    const searchParams = new URLSearchParams(location.search);
    const isQuickOrder = searchParams.get('productId');

    return (
      <div className="stepper">
        {steps.map((label, index) => (
          <div
            key={label}
            className={`step ${index === activeStep ? 'active' : ''} ${
              index < activeStep || (isQuickOrder && index === 0)
                ? 'completed'
                : ''
            }`}
          >
            <div className="step-icon">
              {index < activeStep || (isQuickOrder && index === 0)
                ? '✓'
                : index + 1}
            </div>
            <div className="step-label">{label}</div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="subscription-container">
      <h1 className="subscription-title">구독/결제</h1>

      {renderStepper()}

      {error && <div className="alert alert-error">{error}</div>}

      <div className="content-paper">
        {getStepContent(activeStep)}

        {/* 계좌번호 정보 */}
        <div className="account-info">
          <p className="account-text">
            계좌번호: 카카오뱅크{' '}
            <span className="account-number">3333-30-8265756</span> 김봉준
          </p>
        </div>

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

      {/* 이미지 모달 */}
      {renderImageModal()}
    </div>
  );
};

export default Subscription;

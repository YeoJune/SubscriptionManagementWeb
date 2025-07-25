// src/pages/PaymentResult.tsx 수정된 버전
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import './PaymentResult.css';

interface PaymentResultData {
  success: boolean;
  message?: string;
  payment?: {
    id: number;
    order_id: string;
    status: string;
    amount: number;
    paid_at: string;
    receipt_url?: string;
  };
  delivery_count?: number;
  deliveries?: any[];
  error?: string;
  errorCode?: string;
}

const PaymentResult: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PaymentResultData | null>(null);

  useEffect(() => {
    processPaymentResult();
  }, []);

  const processPaymentResult = async () => {
    try {
      // URL 파라미터에서 결제 결과 정보 추출
      const success = searchParams.get('success') === 'true';
      const orderId = searchParams.get('orderId');
      const authToken = searchParams.get('authToken'); // 나이스페이에서 받은 authToken
      const tid = searchParams.get('tid');
      const amount = searchParams.get('amount');
      const authResultCode = searchParams.get('authResultCode');
      const authResultMsg = searchParams.get('authResultMsg');
      const error = searchParams.get('error');

      if (!orderId) {
        setResult({
          success: false,
          error: '잘못된 접근입니다. 주문 정보를 확인할 수 없습니다.',
        });
        setLoading(false);
        return;
      }

      // 결제 인증 성공한 경우
      if (success && authResultCode === '0000' && authToken) {
        try {
          // 세션에서 선택된 배송일 가져오기
          const selectedDatesStr = sessionStorage.getItem('selectedDates');
          const selectedDates = selectedDatesStr
            ? JSON.parse(selectedDatesStr)
            : null;

          // 승인 요청 API 호출 (authToken 사용)
          const approvalData: any = {
            orderId: orderId,
            authToken: authToken, // 나이스페이에서 받은 authToken 사용
            amount: amount,
          };

          // 선택된 배송일이 있으면 추가
          if (selectedDates && selectedDates.length > 0) {
            approvalData.selected_dates = selectedDates;
          }

          const approvalResponse = await axios.post(
            '/api/payments/approve',
            approvalData
          );

          // 세션에서 배송일 정보 제거
          sessionStorage.removeItem('selectedDates');
          sessionStorage.removeItem('specialRequest');

          setResult(approvalResponse.data);
        } catch (error: any) {
          console.error('결제 승인 처리 중 오류:', error);
          setResult({
            success: false,
            error:
              error.response?.data?.error ||
              '결제 승인 처리 중 오류가 발생했습니다.',
          });
        }
      }
      // 결제 인증 실패한 경우
      else if (!success) {
        let errorMessage = '결제 처리 중 오류가 발생했습니다.';

        if (error === 'server_error') {
          errorMessage = '서버 오류가 발생했습니다.';
        } else if (error === 'payment_not_found') {
          errorMessage = '결제 정보를 찾을 수 없습니다.';
        } else if (error === 'database_error') {
          errorMessage = '데이터베이스 오류가 발생했습니다.';
        } else if (error === 'auth_failed') {
          errorMessage = '결제 인증에 실패했습니다.';
        } else if (authResultMsg) {
          errorMessage = decodeURIComponent(authResultMsg);
        } else if (authResultCode && authResultCode !== '0000') {
          errorMessage = `결제 인증 실패 (오류 코드: ${authResultCode})`;
        }

        setResult({
          success: false,
          error: errorMessage,
          errorCode: authResultCode || undefined,
        });
      }
      // 파라미터가 부족한 경우
      else {
        setResult({
          success: false,
          error: '결제 결과 정보가 부족합니다.',
        });
      }
    } catch (error: any) {
      console.error('결제 결과 처리 중 오류:', error);
      setResult({
        success: false,
        error: '결제 결과 처리 중 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleGoToMyPage = () => {
    navigate('/profile'); // 또는 적절한 마이페이지 경로
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString() + '원';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  if (loading) {
    return (
      <div className="payment-result-container">
        <div className="result-card">
          <div className="loading-section">
            <div className="loading-spinner large"></div>
            <h2>결제 정보 확인 중...</h2>
            <p>잠시만 기다려 주십시오.</p>
            <p className="loading-notice">
              결제 정보를 확인하고 있습니다. 창을 닫지 마세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-result-container">
      <div className="result-card">
        {result?.success ? (
          // 결제 성공
          <div className="success-section">
            <div className="success-icon">✓</div>
            <h2 className="success-title">결제 완료</h2>
            <p className="success-message">
              {result.message || '결제가 성공적으로 완료되었습니다.'}
            </p>

            {result.payment && (
              <div className="receipt-info">
                <h3>결제 정보</h3>
                <dl className="receipt-details">
                  <dt>주문번호</dt>
                  <dd>{result.payment.order_id}</dd>

                  <dt>결제금액</dt>
                  <dd>{formatAmount(result.payment.amount)}</dd>

                  <dt>결제방법</dt>
                  <dd>신용카드</dd>

                  <dt>결제일시</dt>
                  <dd>{formatDate(result.payment.paid_at)}</dd>
                </dl>

                {result.payment.receipt_url && (
                  <a
                    href={result.payment.receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="receipt-link"
                  >
                    영수증 보기
                  </a>
                )}
              </div>
            )}

            {result.delivery_count && (
              <div className="delivery-info">
                <p className="delivery-notice">
                  <strong>배송 안내:</strong> 총 {result.delivery_count}회의
                  배송이 자동으로 스케줄되었습니다. 자세한 배송 일정은
                  마이페이지에서 확인하실 수 있습니다.
                </p>
              </div>
            )}

            <div className="action-buttons">
              <button className="btn btn-primary" onClick={handleGoToMyPage}>
                마이페이지로 이동
              </button>
              <button className="btn btn-outline" onClick={handleGoHome}>
                홈으로 이동
              </button>
            </div>
          </div>
        ) : (
          // 결제 실패
          <div className="error-section">
            <div className="error-icon">✗</div>
            <h2 className="error-title">결제 실패</h2>
            <p className="error-message">
              {result?.error || '결제 처리 중 오류가 발생했습니다.'}
            </p>

            {result?.errorCode && (
              <p className="error-code">오류 코드: {result.errorCode}</p>
            )}

            <div className="action-buttons">
              <button
                className="btn btn-primary"
                onClick={() => navigate('/subscription')}
              >
                다시 시도
              </button>
              <button className="btn btn-outline" onClick={handleGoHome}>
                홈으로 이동
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentResult;

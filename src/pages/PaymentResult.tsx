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
      const tid = searchParams.get('tid');
      const amount = searchParams.get('amount');
      const resultCode = searchParams.get('resultCode');
      const resultMsg = searchParams.get('resultMsg');
      const status = searchParams.get('status');
      const error = searchParams.get('error');

      if (!orderId) {
        setResult({
          success: false,
          error: '잘못된 접근입니다. 주문 정보를 확인할 수 없습니다.',
        });
        setLoading(false);
        return;
      }

      // 결제 성공한 경우
      if (success && resultCode === '0000' && tid) {
        try {
          // 이미 서버에서 DB 업데이트가 완료되었으므로
          // 여기서는 최종 결제 정보만 조회하면 됩니다

          // 세션에서 선택된 배송일 가져오기
          const selectedDatesStr = sessionStorage.getItem('selectedDates');
          const selectedDates = selectedDatesStr
            ? JSON.parse(selectedDatesStr)
            : null;

          // 결제가 완료된 상태라면 배송 처리를 위해 approve API 호출
          if (status === 'completed' || !status) {
            const approvalData: any = {
              orderId: orderId,
              authToken: tid,
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

            setResult(approvalResponse.data);
          } else {
            // ready 상태인 경우 (가상계좌 등)
            setResult({
              success: true,
              message: '결제 요청이 접수되었습니다.',
              payment: {
                id: 0,
                order_id: orderId,
                status: status || 'ready',
                amount: parseInt(amount || '0'),
                paid_at: new Date().toISOString(),
              },
            });
          }

          // 세션에서 배송일 정보 제거
          sessionStorage.removeItem('selectedDates');
          sessionStorage.removeItem('specialRequest');
        } catch (error: any) {
          console.error('후속 처리 중 오류:', error);

          // API 호출이 실패해도 결제는 완료된 것으로 처리
          setResult({
            success: true,
            message: '결제는 완료되었습니다.',
            payment: {
              id: 0,
              order_id: orderId,
              status: 'completed',
              amount: parseInt(amount || '0'),
              paid_at: new Date().toISOString(),
            },
            error:
              '일부 후속 처리에서 오류가 발생했을 수 있습니다. 고객센터로 문의해 주세요.',
          });
        }
      }
      // 결제 실패한 경우
      else if (!success) {
        let errorMessage = '결제 처리 중 오류가 발생했습니다.';

        if (error === 'server_error') {
          errorMessage = '서버 오류가 발생했습니다.';
        } else if (error === 'payment_not_found') {
          errorMessage = '결제 정보를 찾을 수 없습니다.';
        } else if (error === 'database_error') {
          errorMessage = '데이터베이스 오류가 발생했습니다.';
        } else if (resultMsg) {
          errorMessage = decodeURIComponent(resultMsg);
        } else if (resultCode && resultCode !== '0000') {
          errorMessage = `결제 실패 (오류 코드: ${resultCode})`;
        }

        setResult({
          success: false,
          error: errorMessage,
          errorCode: resultCode || undefined,
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

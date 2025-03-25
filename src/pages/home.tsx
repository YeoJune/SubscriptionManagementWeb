// src/pages/home.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import './home.css';

interface DeliveryInfo {
  remainingCount?: number;
  nextDelivery?: Date;
  upcomingDeliveries?: Array<{ date: string; status: string }>;
}

const Home: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDeliveryInfo();
    }
  }, [isAuthenticated]);

  const fetchDeliveryInfo = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/delivery/my');

      const deliveries = response.data.deliveries || [];
      const pendingDeliveries = deliveries
        .filter((d: any) => d.status === 'pending')
        .sort(
          (a: any, b: any) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      setDeliveryInfo({
        remainingCount: user?.delivery_count || 0,
        nextDelivery:
          pendingDeliveries.length > 0
            ? new Date(pendingDeliveries[0].date)
            : undefined,
        upcomingDeliveries: pendingDeliveries.map((d: any) => ({
          date: d.date,
          status: d.status,
        })),
      });
    } catch (error) {
      console.error('Failed to fetch delivery info:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-container">
      <section className="home-hero">
        <h1>배송 관리 시스템</h1>
        <p>효율적인 배송 관리를 위한 올인원 솔루션</p>

        {!isAuthenticated ? (
          <div className="cta-buttons">
            <Link to="/login" className="btn btn-primary">
              로그인
            </Link>
            <Link to="/register" className="btn btn-secondary">
              회원가입
            </Link>
          </div>
        ) : (
          <div className="user-summary">
            <h2>배송 현황</h2>
            {loading ? (
              <p>데이터를 불러오는 중...</p>
            ) : (
              <>
                <p>
                  남은 배송 횟수:{' '}
                  <strong>{deliveryInfo?.remainingCount || 0}회</strong>
                </p>
                {deliveryInfo?.nextDelivery && (
                  <p>
                    다음 배송 일정:{' '}
                    <strong>
                      {deliveryInfo.nextDelivery.toLocaleDateString()}
                    </strong>
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </section>

      <section className="featured-services">
        <h2>주요 서비스</h2>
        <div className="service-cards">
          <div className="service-card">
            <h3>공지사항</h3>
            <p>최신 업데이트 및 중요 안내사항</p>
            <Link to="/board" className="card-link">
              바로가기
            </Link>
          </div>

          <div className="service-card">
            <h3>내 프로필</h3>
            <p>회원 정보 및 배송 상세 확인</p>
            <Link to="/profile" className="card-link">
              바로가기
            </Link>
          </div>

          <div className="service-card">
            <h3>상품 결제</h3>
            <p>새로운 배송 일정 예약하기</p>
            <Link to="/subscription" className="card-link">
              바로가기
            </Link>
          </div>

          <div className="service-card">
            <h3>고객의 소리</h3>
            <p>문의 및 피드백</p>
            <Link to="/inquiry" className="card-link">
              바로가기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

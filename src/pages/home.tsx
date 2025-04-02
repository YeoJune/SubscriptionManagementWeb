// src/pages/home.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './home.css';

interface DeliveryInfo {
  productDeliveries?: Array<{
    product_id: number;
    product_name: string;
    remaining_count: number;
  }>;
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
      // 배송 목록 가져오기
      const response = await axios.get('/api/delivery/my');

      // 상품별 배송 잔여 횟수 가져오기
      const productResponse = await axios.get('/api/delivery/products');

      const deliveries = response.data.deliveries || [];
      const pendingDeliveries = deliveries
        .filter((d: any) => d.status === 'pending')
        .sort(
          (a: any, b: any) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

      setDeliveryInfo({
        productDeliveries: productResponse.data.products || [],
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
        <h1>Saluv All Day</h1>
        <p>기분이 좋아지는 음식, 샐럽올데이</p>

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
                {deliveryInfo?.productDeliveries &&
                deliveryInfo.productDeliveries.length > 0 ? (
                  <div className="product-deliveries">
                    <p>남은 배송 횟수:</p>
                    {deliveryInfo.productDeliveries.map((product) => (
                      <p key={product.product_id}>
                        {product.product_name}:{' '}
                        <strong>{product.remaining_count}회</strong>
                      </p>
                    ))}
                  </div>
                ) : (
                  <p>구독 중인 상품이 없습니다.</p>
                )}
                {deliveryInfo?.nextDelivery && (
                  <p>
                    다음 배송 일정:{' '}
                    <strong>
                      {deliveryInfo.nextDelivery.toLocaleDateString()}
                    </strong>
                  </p>
                )}
                <div className="cta-buttons">
                  <Link to="/profile" className="btn btn-primary">
                    배송 내역 보기
                  </Link>
                </div>
              </>
            )}
          </div>
        )}
      </section>

      <section className="featured-services">
        <h2>샐럽올데이 서비스</h2>
        <div className="service-cards">
          <div className="service-card">
            <h3>공지사항</h3>
            <p>최신 메뉴 업데이트 및 중요 안내사항</p>
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
            <h3>구독 신청</h3>
            <p>건강한 식단 구독 신청하기</p>
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

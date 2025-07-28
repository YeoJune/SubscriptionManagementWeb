// src/pages/home.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { BoardProps, ProductProps } from '../types';
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

interface HeroSlide {
  id: number;
  title: string;
  subtitle?: string;
  images: string[];
}

const Home: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [deliveryInfo, setDeliveryInfo] = useState<DeliveryInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [notices, setNotices] = useState<BoardProps[]>([]);
  const [noticesLoading, setNoticesLoading] = useState<boolean>(false);
  const [products, setProducts] = useState<ProductProps[]>([]);
  const [productsLoading, setProductsLoading] = useState<boolean>(false);
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [heroLoading, setHeroLoading] = useState<boolean>(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDeliveryInfo();
    }
    fetchRecentNotices();
    fetchProducts();
    fetchHeroSlides();
  }, [isAuthenticated]);

  // 히어로 슬라이드 이미지 변경 효과
  useEffect(() => {
    if (heroSlides.length === 0) return;

    const currentSlide = heroSlides[currentSlideIndex];
    if (!currentSlide || currentSlide.images.length === 0) return;

    const interval = setInterval(() => {
      const currentSlide = heroSlides[currentSlideIndex];
      if (currentSlide && currentSlide.images.length > 1) {
        setCurrentImageIndex((prevIndex) =>
          Math.floor(Math.random() * currentSlide.images.length)
        );
      }
    }, 4000); // 4초마다 변경

    return () => clearInterval(interval);
  }, [heroSlides, currentSlideIndex]);

  const fetchHeroSlides = async () => {
    setHeroLoading(true);
    try {
      const response = await axios.get('/api/hero');
      const slides = response.data.slides || [];
      setHeroSlides(slides);
    } catch (error) {
      console.error('Failed to fetch hero slides:', error);
      setHeroSlides([]);
    } finally {
      setHeroLoading(false);
    }
  };

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

  const fetchRecentNotices = async () => {
    setNoticesLoading(true);
    try {
      const response = await axios.get('/api/notices', {
        params: {
          page: 1,
          limit: 5,
          type: 'normal',
        },
      });

      const notices = response.data.notices.map((notice: any) => ({
        id: notice.id,
        title: notice.title,
        content: notice.content || '',
        type: notice.type,
        createdAt: new Date(notice.created_at),
        images: notice.images || [],
      }));

      setNotices(notices);
    } catch (error) {
      console.error('Failed to fetch notices:', error);
    } finally {
      setNoticesLoading(false);
    }
  };

  const fetchProducts = async () => {
    setProductsLoading(true);
    try {
      const response = await axios.get('/api/products');
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleQuickOrder = (productId: number) => {
    navigate(`/subscription?productId=${productId}`);
  };

  const currentSlide = heroSlides[currentSlideIndex];
  const currentImage = currentSlide?.images?.[currentImageIndex];

  return (
    <div className="home-container">
      <section className="home-hero">
        {heroLoading ? (
          <div className="hero-loading">
            <div className="loading-spinner"></div>
            <p>로딩 중...</p>
          </div>
        ) : heroSlides.length > 0 && currentSlide ? (
          <>
            <div className="hero-background">
              <img
                src={currentImage}
                alt={currentSlide.title}
                className="hero-image"
              />
              <div className="hero-overlay"></div>
            </div>

            <div className="hero-content">
              <h1>{currentSlide.title}</h1>
              {currentSlide.subtitle && <p>{currentSlide.subtitle}</p>}
            </div>
          </>
        ) : (
          <div className="hero-fallback">
            <div className="hero-content">
              <h1>Saluv All Day</h1>
              <p>기분이 좋아지는 음식, 건강한 하루를 만들어가세요</p>
            </div>
          </div>
        )}
      </section>

      {/* 빠른 구매 섹션 */}
      <section className="quick-order-section">
        <h2>정기배송 식단표</h2>

        {productsLoading ? (
          <div className="products-loading">
            <div className="loading-spinner"></div>
            <p>상품을 불러오는 중...</p>
          </div>
        ) : (
          <div className="quick-order-menu">
            {products.length > 0 ? (
              products.slice(0, 4).map((product) => (
                <div
                  key={product.id}
                  className="menu-item"
                  onClick={() => handleQuickOrder(product.id)}
                >
                  {product.image_path ? (
                    <div className="menu-image">
                      <img src={product.image_path} alt={product.name} />
                    </div>
                  ) : (
                    <div className="menu-icon">🍱</div>
                  )}
                  <h3>{product.name}</h3>
                  <div className="menu-price">
                    {product.price.toLocaleString()}원
                  </div>
                </div>
              ))
            ) : (
              <p className="no-products">등록된 상품이 없습니다.</p>
            )}
          </div>
        )}

        {/* 계좌번호 정보 */}
        <div className="account-info">
          <p className="account-text">
            계좌번호: 카카오뱅크{' '}
            <span className="account-number">3333-30-8265756</span> 김봉준
          </p>
        </div>
      </section>

      {/* 로그인 시 공지사항 섹션 표시 */}
      {isAuthenticated && (
        <section className="notices-section">
          <div className="section-header">
            <h2>최신 공지사항</h2>
            <Link to="/board" className="view-all-link">
              전체 보기
            </Link>
          </div>

          {noticesLoading ? (
            <div className="notices-loading">
              <div className="loading-spinner"></div>
              <p>공지사항을 불러오는 중...</p>
            </div>
          ) : (
            <div className="notices-list">
              {notices.length > 0 ? (
                notices.map((notice) => (
                  <div key={notice.id} className="notice-item">
                    <Link to={`/board/${notice.id}`} className="notice-link">
                      <h4>{notice.title}</h4>
                      <p className="notice-date">
                        {notice.createdAt.toLocaleDateString()}
                      </p>
                    </Link>
                  </div>
                ))
              ) : (
                <p className="no-notices">최신 공지사항이 없습니다.</p>
              )}
            </div>
          )}
        </section>
      )}

      <section className="featured-services">
        <h2>샐럽올데이 서비스</h2>
        <div className="service-cards">
          {isAuthenticated && (
            <div className="service-card">
              <h3>내 프로필</h3>
              <p>회원 정보 및 배송 상세 확인</p>
              <Link to="/profile" className="card-link">
                바로가기
              </Link>
            </div>
          )}

          <div className="service-card">
            <h3>정기배송신청</h3>
            <p>건강한 식단 정기 구독 신청</p>
            <Link to="/subscription" className="card-link">
              바로가기
            </Link>
          </div>

          <div className="service-card">
            <h3>불편/건의 사항</h3>
            <p>문의 및 피드백</p>
            <Link to="/inquiry" className="card-link">
              바로가기
            </Link>
          </div>
          <div className="service-card">
            <h3>단체주문/케이터링 문의</h3>
            <p>기업/행사/대량 주문 및 케이터링 문의</p>
            <Link to="/catering" className="card-link">
              바로가기
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

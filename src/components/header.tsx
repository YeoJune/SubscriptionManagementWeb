// src/components/header.tsx
import './header.css';
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const isAdmin = user?.isAdmin;
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 스크롤 이벤트 핸들링
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  // 현재 active된 링크 확인
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // 모바일 메뉴 토글
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // 모든 상품의 배송 잔여 횟수의 총합 계산
  const getTotalRemainingDeliveries = () => {
    if (!user?.product_delivery || user.product_delivery.length === 0) {
      return 0;
    }
    return user.product_delivery.reduce(
      (total, product) => total + product.remaining_count,
      0
    );
  };

  return (
    <header className={`sal-header ${scrolled ? 'sal-header-scrolled' : ''}`}>
      <div className="container">
        <div className="sal-toolbar">
          {/* 왼쪽 영역: 로고(또는 앱 타이틀) */}
          <div className="sal-logo-section">
            <Link to="/" className="sal-logo-link">
              <span className="sal-logo-text"></span>
            </Link>
          </div>

          {/* 모바일 메뉴 토글 버튼 */}
          <button className="sal-mobile-menu-toggle" onClick={toggleMobileMenu}>
            <span className="sal-menu-icon"></span>
          </button>

          {/* 중앙 영역: 4개의 주요 카테고리 네비게이션 메뉴 */}
          <nav
            className={`sal-nav-section ${mobileMenuOpen ? 'sal-menu-open' : ''}`}
          >
            <Link
              to="/"
              className={`sal-nav-button ${isActive('/') || isActive('/board') ? 'sal-active-nav-button' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              홈/공지사항
            </Link>
            <Link
              to="/subscription"
              className={`sal-nav-button ${isActive('/subscription') ? 'sal-active-nav-button' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              정기배송신청
            </Link>
            {isAuthenticated && (
              <>
                <Link
                  to="/profile"
                  className={`sal-nav-button ${isActive('/profile') ? 'sal-active-nav-button' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  내 프로필
                </Link>
                <Link
                  to="/inquiry"
                  className={`sal-nav-button ${isActive('/inquiry') ? 'sal-active-nav-button' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  불편/건의 사항
                </Link>
              </>
            )}

            {/* 관리자 메뉴 (관리자만 표시) */}
            {isAdmin && (
              <Link
                to="/admin"
                className={`sal-admin-button ${location.pathname.startsWith('/admin') ? 'sal-active-admin-button' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                관리자
              </Link>
            )}
          </nav>

          {/* 오른쪽 영역: 로그인/로그아웃 버튼 */}
          <div className="sal-auth-section">
            {!isAuthenticated ? (
              <>
                <Link
                  to="/register"
                  className="sal-auth-button sal-register-button"
                >
                  회원가입
                </Link>
                <Link to="/login" className="sal-auth-button sal-login-button">
                  로그인
                </Link>
              </>
            ) : (
              <>
                {user?.product_delivery && (
                  <div className="sal-delivery-count">
                    <span className="sal-badge-label">남은 배송</span>
                    <span className="sal-badge">
                      {getTotalRemainingDeliveries()}
                    </span>
                  </div>
                )}
                <button
                  className="sal-auth-button sal-logout-button"
                  onClick={logout}
                >
                  로그아웃
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

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

  return (
    <header className={`header ${scrolled ? 'header-scrolled' : ''}`}>
      <div className="container">
        <div className="toolbar">
          {/* 왼쪽 영역: 로고(또는 앱 타이틀) */}
          <div className="logo-section">
            <Link to="/" className="logo-link">
              <img
                src="/public/images/logo.jpg"
                alt="Saluv All Day"
                className="logo-image"
              />
              <span className="logo-text">Saluv All Day</span>
            </Link>
          </div>

          {/* 모바일 메뉴 토글 버튼 */}
          <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
            <span className="menu-icon"></span>
          </button>

          {/* 중앙 영역: 네비게이션 메뉴 */}
          <nav className={`nav-section ${mobileMenuOpen ? 'menu-open' : ''}`}>
            <Link
              to="/"
              className={`nav-button ${isActive('/') ? 'active-nav-button' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              홈
            </Link>
            <Link
              to="/board"
              className={`nav-button ${isActive('/board') ? 'active-nav-button' : ''}`}
              onClick={() => setMobileMenuOpen(false)}
            >
              공지사항
            </Link>

            {isAuthenticated && (
              <>
                <Link
                  to="/profile"
                  className={`nav-button ${isActive('/profile') ? 'active-nav-button' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  내 프로필
                </Link>
                <Link
                  to="/subscription"
                  className={`nav-button ${isActive('/subscription') ? 'active-nav-button' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  구독신청
                </Link>
                <Link
                  to="/inquiry"
                  className={`nav-button ${isActive('/inquiry') ? 'active-nav-button' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  고객의 소리
                </Link>
              </>
            )}

            {isAdmin && (
              <Link
                to="/admin"
                className={`admin-button ${location.pathname.startsWith('/admin') ? 'active-admin-button' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                관리자
              </Link>
            )}
          </nav>

          {/* 오른쪽 영역: 로그인/로그아웃 버튼 */}
          <div className="auth-section">
            {!isAuthenticated ? (
              <>
                <Link to="/register" className="auth-button register-button">
                  회원가입
                </Link>
                <Link
                  to="/login"
                  className="auth-button login-button btn-primary"
                >
                  로그인
                </Link>
              </>
            ) : (
              <>
                {user?.delivery_count !== undefined && (
                  <div className="delivery-count">
                    <span className="badge-label">남은 배송</span>
                    <span className="badge">{user.delivery_count}</span>
                  </div>
                )}
                <button className="auth-button logout-button" onClick={logout}>
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

// src/components/footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import './footer.css';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        {/* About Section */}
        <div className="footer-section">
          <h4>Saluv All Day</h4>
          <p>기분이 좋아지는 음식, 샐럽올데이</p>
          <p>건강하고 맛있는 식단을 당신의 일상에 배달합니다.</p>
        </div>

        {/* Quick Links */}
        <div className="footer-section">
          <h4>메뉴</h4>
          <ul>
            <li>
              <Link to="/">홈</Link>
            </li>
            <li>
              <Link to="/board">공지사항</Link>
            </li>
            <li>
              <Link to="/inquiry">고객의 소리</Link>
            </li>
          </ul>
        </div>

        {/* Contact Information */}
        <div className="footer-section">
          <h4>연락처</h4>
          <p>제주시 첨단로 123</p>
          <p>전화: 064-750-0910 / 010-4896-3633</p>
          <p>이메일: hello@saluv.co.kr</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {currentYear} Saluv All Day. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;

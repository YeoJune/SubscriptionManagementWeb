// src/components/footer.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import './footer.css';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="sal-footer">
      <div className="sal-footer-container">
        {/* About Section */}
        <div className="sal-footer-section">
          <h4>Saluv All Day</h4>
          <p>기분이 좋아지는 음식, 샐럽올데이</p>
          <p>건강하고 맛있는 식단을 당신의 일상에 배달합니다.</p>
        </div>

        {/* Quick Links */}
        <div className="sal-footer-section">
          <h4>메뉴</h4>
          <ul>
            <li>
              <Link to="/">홈/공지사항</Link>
            </li>
            <li>
              <Link to="/profile">내 프로필</Link>
            </li>
            <li>
              <Link to="/subscription">정기배송신청</Link>
            </li>
            <li>
              <Link to="/inquiry">불편/건의 사항</Link>
            </li>
          </ul>
        </div>

        {/* Contact Information */}
        <div className="sal-footer-section">
          <h4>연락처</h4>
          <p>상호: 샐럽올데이</p>
          <p>사업자등록번호: 640-30-01556</p>
          <p>주소: 제주시 귀아랑길 13, 1층(연동)</p>
          <p>전화: 064-745-0910</p>
          <p>이메일: tenacity0910@gmail.com</p>
        </div>
      </div>

      <div className="sal-footer-bottom">
        <p>&copy; {currentYear} Saluv All Day. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;

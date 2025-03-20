// src/components/footer.tsx
import React from 'react';
import './footer.css'; // Import your CSS file for styling

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* About Section */}
        <div className="footer-section">
          <h4>About Us</h4>
          <p>Your one-stop destination for all your shopping needs!</p>
        </div>
        {/* Quick Links */}
        <div className="footer-section">
          <h4>Quick Links</h4>
          <ul>
            <li>
              <a href="/">Home</a>
            </li>
            <li>
              <a href="/products">Products</a>
            </li>
            <li>
              <a href="/contact">Contact</a>
            </li>
            <li>
              <a href="/about">About</a>
            </li>
          </ul>
        </div>
        {/* Contact Information */}
        <div className="footer-section">
          <h4>Contact</h4>
          <p>123 Shopping Street, ShopCity</p>
          <p>Email: info@shoppingmall.com</p>
          <p>Phone: (123) 456-7890</p>
        </div>
      </div>
      <div className="footer-bottom">
        <p>
          &copy; 2025~{new Date().getFullYear()} Shopping Mall. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;

// src/components/userCard.tsx
import React from 'react';
import './userCard.css';
import { UserProps } from '../types';

interface UserCardProps {
  user: UserProps;
}

const UserCard: React.FC<UserCardProps> = ({ user }) => {
  // 첫 글자를 대문자로 변환
  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="user-card">
      <div className="user-card-header">
        <div className="user-avatar">{getInitial(user.id)}</div>
        <h3 className="user-name">{user.name || user.id}</h3>
        {user.isAdmin && <span className="user-role">관리자</span>}
      </div>

      <div className="user-card-content">
        <div className="user-info-stack">
          {user.phone_number && (
            <div className="user-info-item">
              <span className="user-info-label">아이디:</span>
              <span className="user-info-value">{user.id}</span>
            </div>
          )}

          {user.phone_number && (
            <div className="user-info-item">
              <span className="user-info-label">이름:</span>
              <span className="user-info-value">{user.name}</span>
            </div>
          )}

          {user.phone_number && (
            <div className="user-info-item">
              <span className="user-info-label">전화번호:</span>
              <span className="user-info-value">{user.phone_number}</span>
            </div>
          )}

          {user.email && (
            <div className="user-info-item">
              <span className="user-info-label">이메일:</span>
              <span className="user-info-value">{user.email}</span>
            </div>
          )}

          {user.address && (
            <div className="user-info-item">
              <span className="user-info-label">주소:</span>
              <span className="user-info-value">{user.address}</span>
            </div>
          )}

          {user.created_at && (
            <div className="user-info-item">
              <span className="user-info-label">가입일:</span>
              <span className="user-info-value">
                {new Date(user.created_at).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserCard;

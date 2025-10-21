// src/pages/register.tsx
import React, { useState, useEffect } from 'react';
import './register.css';
import { useNavigate } from 'react-router-dom';

const Register: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState<string>('');
  const [id, setId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [passwordConfirm, setPasswordConfirm] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // 에러 상태
  const [nameError, setNameError] = useState<string | null>(null);
  const [idError, setIdError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordMatchError, setPasswordMatchError] = useState<string | null>(
    null
  );
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // 토스트 메시지 상태
  const [toast, setToast] = useState<{
    type: 'error' | 'success';
    message: string;
  } | null>(null);

  // 토스트 메시지 타이머
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
        // 성공 메시지 후 로그인 페이지로 리디렉션
        if (toast.type === 'success') {
          navigate('/login');
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [toast, navigate]);

  // 실시간 입력 검증
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setName(value);
    if (value.length === 0) {
      setNameError('이름을 입력해주세요');
    } else {
      setNameError(null);
    }
  };

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setId(value);

    if (value.length === 0) {
      setIdError('아이디를 입력해주세요');
    } else if (value.length < 4) {
      setIdError('아이디는 4자 이상이어야 합니다');
    } else if (value.length > 20) {
      setIdError('아이디는 20자 이하여야 합니다');
    } else if (!/^[a-zA-Z]/.test(value)) {
      setIdError('아이디는 영문자로 시작해야 합니다');
    } else if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(value)) {
      setIdError(
        '아이디는 영문자, 숫자, 언더스코어(_), 하이픈(-)만 사용 가능합니다'
      );
    } else {
      setIdError(null);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    setPasswordError(
      value.length >= 8 ? null : '비밀번호는 8자 이상이어야 합니다'
    );

    // 입력 중에도 비밀번호 일치 여부 갱신
    if (passwordConfirm) {
      setPasswordMatchError(
        passwordConfirm === value ? null : '비밀번호가 일치하지 않습니다'
      );
    }
  };

  const handlePasswordConfirmChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setPasswordConfirm(value);
    setPasswordMatchError(
      password === value ? null : '비밀번호가 일치하지 않습니다'
    );
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPhoneNumber(value);

    // 간단한 전화번호 유효성 검사 (선택 사항)
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(value) && value.length > 0) {
      setPhoneError('유효한 전화번호를 입력해주세요');
    } else {
      setPhoneError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // 모든 필드 입력 확인
    if (!name || !id || !password || !passwordConfirm) {
      setToast({ type: 'error', message: '모든 항목을 입력해주세요' });
      return;
    }

    // 유효성 검사 오류 확인
    if (
      nameError ||
      idError ||
      passwordError ||
      passwordMatchError ||
      phoneError
    ) {
      setToast({ type: 'error', message: '입력값을 확인해주세요' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          password,
          name,
          phone_number: phoneNumber,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setToast({
          type: 'error',
          message: data.message || '회원가입에 실패했습니다',
        });
        setLoading(false);
        return;
      }

      setToast({
        type: 'success',
        message: '회원가입이 완료되었습니다! 로그인 페이지로 이동합니다.',
      });
    } catch (error: any) {
      setToast({
        type: 'error',
        message: error.message || '알 수 없는 오류가 발생했습니다',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseToast = () => {
    setToast(null);
  };

  return (
    <div className="register-container">
      {/* 토스트 메시지 */}
      {toast && (
        <div className="toast-container">
          <div className={`toast toast-${toast.type}`}>
            <span>{toast.message}</span>
            <button className="toast-close" onClick={handleCloseToast}>
              ×
            </button>
          </div>
        </div>
      )}

      <div className="register-card">
        <h1 className="register-title">회원가입</h1>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">
              이름
            </label>
            <input
              id="name"
              type="text"
              className={`form-control ${nameError ? 'error' : ''}`}
              value={name}
              onChange={handleNameChange}
              required
            />
            {nameError && <p className="error-text">{nameError}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="id" className="form-label">
              아이디
            </label>
            <input
              id="id"
              type="text"
              className={`form-control ${idError ? 'error' : ''}`}
              value={id}
              onChange={handleIdChange}
              required
            />
            {idError && <p className="error-text">{idError}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="phone" className="form-label">
              전화번호
            </label>
            <input
              id="phone"
              type="tel"
              className={`form-control ${phoneError ? 'error' : ''}`}
              value={phoneNumber}
              onChange={handlePhoneChange}
              placeholder="01012345678"
            />
            {phoneError && <p className="error-text">{phoneError}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              className={`form-control ${passwordError ? 'error' : ''}`}
              value={password}
              onChange={handlePasswordChange}
              required
            />
            {passwordError && <p className="error-text">{passwordError}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="password-confirm" className="form-label">
              비밀번호 확인
            </label>
            <input
              id="password-confirm"
              type="password"
              className={`form-control ${passwordMatchError ? 'error' : ''}`}
              value={passwordConfirm}
              onChange={handlePasswordConfirmChange}
              required
            />
            {passwordMatchError && (
              <p className="error-text">{passwordMatchError}</p>
            )}
          </div>

          <button type="submit" className="register-button" disabled={loading}>
            {loading ? '회원가입 중...' : '회원가입'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Register;

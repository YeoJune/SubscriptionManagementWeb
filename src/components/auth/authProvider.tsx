// src/components/auth/authProvider.tsx
import React, { createContext, useState, useEffect } from 'react';
import { AuthContextProps, UserProps } from '../../types';

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  isAuthenticated: false,
  login: async (_id: string, _password: string) => {
    return { success: false, message: 'Not Implemented' };
  },
  logout: async () => {},
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProps | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth', {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Session check failed:', error);
      }
    };

    checkSession();
  }, []);

  // Login function
  const login = async (id: string, password: string) => {
    try {
      // Call the login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.error || '로그인에 실패했습니다.',
        };
      }

      const data = await response.json();
      setUser(data.user);
      return {
        success: true,
        message: data.message || '로그인에 성공했습니다.',
      };
    } catch (error) {
      console.error('Login Failed: ', error);
      return {
        success: false,
        message: '예기치 않은 오류가 발생했습니다.',
      };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const contextValue: AuthContextProps = {
    user,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

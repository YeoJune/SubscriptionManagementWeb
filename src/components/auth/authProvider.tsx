// src/components/authProvider.tsx
import React, { createContext, useState, useEffect } from 'react';
import { AuthContextProps, UserProps } from '../../types';

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  isAuthenticated: false,
  login: async (_user: UserProps) => {
    return { success: false, message: 'Not Implemented' };
  },
  logout: () => {},
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkSession = async () => {
      const response = await fetch('/api/auth', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      }
    };

    checkSession();
  }, []);

  // Login function
  const login = async (user: UserProps, password: string) => {
    const { id, phone_number } = user;
    try {
      // Call the login API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id, password, phone_number }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        return {
          success: false,
          message: errorData.message || 'Login Failed',
        };
      }

      const data = await response.json();
      setUser(data.user);
      return { success: true, message: 'Login Successful' };
    } catch (error) {
      console.error('Login Failed: ', error);
      return {
        success: false,
        message: 'An Unexpected Error Occurred',
      };
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  };

  const contextValue: AuthContextProps = {
    user: null,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

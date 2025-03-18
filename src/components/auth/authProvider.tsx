// src/components/authProvider.tsx
import React, { createContext, useState, useEffect } from 'react';
import { AuthContextProps } from '../../types';

export const AuthContext = createContext<AuthContextProps>({
  token: null,
  isAuthenticated: false,
  login: async () => { },
  logout: () => { },
});

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);


  // Restore JWT token when the app is loaded
  useEffect(() => {
    const token = localStorage.getItem('jwtToken');
    if (token) {
      setToken(token);
    }
  }, []);

  // Login function
  const login = async (username: string, password: string) => {
    try {
      // Call the login API
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      })

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      setToken(data.token);
      localStorage.setItem('jwtToken', data.token);
    } catch (error) {
      console.error('Login Failed: ', error);
    }
  };

  const logout = () => {
    setToken(null);
    localStorage.removeItem('jwtToken');
  };

  const contextValue: AuthContextProps = {
    token,
    isAuthenticated: !!token,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};


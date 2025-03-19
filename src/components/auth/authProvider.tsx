// src/components/authProvider.tsx
import React, { createContext, useState, useEffect } from 'react';
import { AuthContextProps } from '../../types';

export const AuthContext = createContext<AuthContextProps>({
  user: null,
  isAuthenticated: false,
  login: async () => { },
  logout: () => { },
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
      })

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      setUser(data.user);
      localStorage.setItem('jwtToken', data.token);
    } catch (error) {
      console.error('Login Failed: ', error);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('jwtToken');
  };

  const contextValue: AuthContextProps = {
    user: null,
    isAuthenticated: !!user,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};


// src/hooks/useAuth.ts
import { useContext } from 'react';
import { AuthContext } from '../components/auth/authProvider';

export const useAuth = () => {
  return useContext(AuthContext);
};

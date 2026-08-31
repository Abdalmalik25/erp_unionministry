/**
 * Authentication Context Provider
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { restoreSession } from '../api/client';
import { selectUser } from '../store/slices/authSlice';

interface AuthContextValue {
  user: any | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isInitialized: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const user = useSelector(selectUser);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await restoreSession();
      setIsInitialized(true);
    };
    init();
  }, []);

  const value: AuthContextValue = {
    user,
    isAuthenticated: !!user,
    isInitialized,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
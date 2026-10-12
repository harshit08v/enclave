'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface AdminUser {
  username: string;
  lastActive?: number;
  expiresAt?: number;
}

interface AdminAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AdminUser | null;
  csrfToken: string | null;
  login: (username: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const router = useRouter();

  const refreshAuth = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/auth', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
          setUser(data.user);
          setCsrfToken(data.csrfToken);
          setIsLoading(false);
          return true;
        }
      }
    } catch {
      // ignore network errors on init
    }
    setIsAuthenticated(false);
    setUser(null);
    setCsrfToken(null);
    setIsLoading(false);
    return false;
  }, []);

  useEffect(() => {
    let mounted = true;
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/auth', { cache: 'no-store' });
        if (res.ok && mounted) {
          const data = await res.json();
          if (data.authenticated) {
            setIsAuthenticated(true);
            setUser(data.user);
            setCsrfToken(data.csrfToken);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // ignore
      }
      if (mounted) {
        setIsAuthenticated(false);
        setUser(null);
        setCsrfToken(null);
        setIsLoading(false);
      }
    };
    checkAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (username: string, pass: string) => {
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: pass })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        setUser(data.user);
        setCsrfToken(data.csrfToken);
        return { success: true };
      }
      return { success: false, error: data.error || 'Authentication failed.' };
    } catch {
      return { success: false, error: 'Network error communicating with server.' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/admin/auth', {
        method: 'DELETE',
        headers: csrfToken ? { 'x-enclave-admin-csrf': csrfToken } : {}
      });
    } catch {
      // ignore
    }
    setIsAuthenticated(false);
    setUser(null);
    setCsrfToken(null);
    router.push('/admin/login');
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        csrfToken,
        login,
        logout,
        refreshAuth
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

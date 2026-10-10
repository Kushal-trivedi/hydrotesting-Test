import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const idleTimerRef = useRef(null);

  // Check current session on mount
  const checkAuth = useCallback(async () => {
    try {
      const data = await authApi.getMe();
      setUser(data);
    } catch (err) {
      // If 401, try to refresh once
      if (err.status === 401) {
        try {
          const refreshed = await authApi.refresh();
          setUser(refreshed.user);
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Sign out
  const signout = useCallback(async () => {
    try {
      await authApi.signout();
    } catch {
      // ignore
    } finally {
      setUser(null);
    }
  }, []);

  // Idle timeout (30 minutes) especially for Operators on shared devices at the pump
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (!user) return;

    // 30 minutes in milliseconds
    const IDLE_LIMIT = 30 * 60 * 1000;
    idleTimerRef.current = setTimeout(() => {
      console.warn('Operator session signed out due to 30-minute inactivity.');
      signout();
    }, IDLE_LIMIT);
  }, [user, signout]);

  useEffect(() => {
    if (!user) return;
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => resetIdleTimer();

    events.forEach((evt) => window.addEventListener(evt, handleActivity));
    resetIdleTimer();

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [user, resetIdleTimer]);

  const signin = async (email, password) => {
    const res = await authApi.signin({ email, password });
    setUser(res.user);
    return res.user;
  };

  const signup = async (payload) => {
    return await authApi.signup(payload);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signin,
        signup,
        signout,
        refreshUser: checkAuth,
        isAuthenticated: Boolean(user && user.status === 'ACTIVE'),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

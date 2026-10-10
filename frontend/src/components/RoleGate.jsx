import React from 'react';
import { useAuth } from '../auth/AuthContext';

export function RoleGate({ allowedRoles = [], fallback = null, children }) {
  const { user } = useAuth();

  if (!user || !user.role) return fallback;

  if (allowedRoles.includes(user.role)) {
    return children;
  }

  return fallback;
}

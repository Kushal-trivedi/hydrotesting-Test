import React from 'react';
import { useAuth } from '../auth/AuthContext';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children, onRedirectToSignIn }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
        <p className="text-sm">Verifying session credentials...</p>
      </div>
    );
  }

  if (!user || user.status !== 'ACTIVE') {
    if (onRedirectToSignIn) {
      onRedirectToSignIn();
    }
    return null;
  }

  return children;
}

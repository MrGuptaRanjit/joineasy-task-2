import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Skeleton from '../common/Skeleton';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-panel rounded-2xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 mx-auto flex items-center justify-center animate-spin text-indigo-400">
            ⏳
          </div>
          <h3 className="text-base font-semibold text-white">Authenticating session...</h3>
          <Skeleton className="h-4 w-3/4 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // If student tries professor route, redirect to student dashboard; and vice versa
    const fallback = user?.role === 'PROFESSOR' ? '/professor/dashboard' : '/student/dashboard';
    return <Navigate to={fallback} replace />;
  }

  return children;
}

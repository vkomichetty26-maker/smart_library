import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getSession } from '../utils/auth';

export default function PrivateRoute({ children, role }) {
  const session = getSession();
  const location = useLocation();

  if (!session) return <Navigate to="/login" state={{ from: location }} replace />;
  if (role && session.role !== role) return <Navigate to={`/dashboard/${session.role}`} replace />;
  return children;
}

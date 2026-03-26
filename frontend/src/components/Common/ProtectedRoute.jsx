import { Navigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth.js';
import Loading from './Loading.jsx';

export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) return <Loading fullScreen message="Authenticating..." />;

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (role && user?.role !== role) return <Navigate to="/unauthorized" replace />;

  return children;
}

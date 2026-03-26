import { useNavigate } from 'react-router-dom';
import { ShieldExclamationIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import useAuth from '../hooks/useAuth.js';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleGoBack = () => {
    if (user?.role === 'admin')  navigate('/admin/dashboard', { replace: true });
    else if (user?.role === 'client') navigate('/client/dashboard', { replace: true });
    else navigate('/login', { replace: true });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <ShieldExclamationIcon className="w-10 h-10 text-red-500" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-8">
          You don't have permission to access this page.
          {user?.role && (
            <span> Your current role is <strong className="capitalize">{user.role}</strong>.</span>
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={handleGoBack}
            className="btn btn-primary btn-lg"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            Go to Dashboard
          </button>
          <button
            onClick={handleLogout}
            className="btn btn-secondary btn-lg"
          >
            Sign Out
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-8">
          If you believe this is an error, please contact your system administrator.
        </p>
      </div>
    </div>
  );
}

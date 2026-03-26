import { useNavigate } from 'react-router-dom';
import { HomeIcon } from '@heroicons/react/24/outline';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="relative mb-6">
          <p className="text-[8rem] font-black text-gray-100 leading-none select-none">404</p>
          <p className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-gray-800">
            Page Not Found
          </p>
        </div>

        <p className="text-gray-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="btn btn-secondary btn-lg"
          >
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary btn-lg"
          >
            <HomeIcon className="w-5 h-5 mr-2" />
            Go Home
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-8">
          VitalMEDS Pharmaceutical Platform
        </p>
      </div>
    </div>
  );
}

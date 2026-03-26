import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EnvelopeIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import useAuth from '../../hooks/useAuth.js';
import useForm from '../../hooks/useForm.js';
import { FormField, SubmitButton } from '../Common/Form.jsx';

const validate = (values) => {
  const errors = {};
  if (!values.email)    errors.email    = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email))
                        errors.email    = 'Invalid email address';
  if (!values.password) errors.password = 'Password is required';
  else if (values.password.length < 6)
                        errors.password = 'Password must be at least 6 characters';
  return errors;
};

export default function Login() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [apiError, setApiError] = useState('');

  const { values, errors, submitting, handleChange, handleBlur, handleSubmit } = useForm(
    { email: '', password: '' },
    validate
  );

  if (isAuthenticated) {
    navigate(user?.role === 'admin' ? '/admin/dashboard' : '/client/dashboard', { replace: true });
    return null;
  }

  const onSubmit = handleSubmit(async (data) => {
    setApiError('');
    const result = await login(data.email, data.password);
    if (result.success) {
      navigate(
        result.role === 'admin' || user?.role === 'admin'
          ? '/admin/dashboard'
          : '/client/dashboard',
        { replace: true }
      );
    } else {
      setApiError(result.error || 'Login failed. Please try again.');
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-2xl shadow-lg mb-4">
            <span className="text-white font-bold text-2xl">V</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Vital<span className="text-teal-600">MEDS</span>
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Pharmaceutical Distribution Platform</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-1">Welcome back</h2>
          <p className="text-sm text-gray-500 mb-6">Sign in to your account to continue</p>

          {apiError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <div className="relative">
              <FormField
                label="Email address"
                name="email"
                type="email"
                value={values.email}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.email}
                placeholder="you@example.com"
                required
              />
              <EnvelopeIcon className="absolute right-3 top-8 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative">
              <FormField
                label="Password"
                name="password"
                type="password"
                value={values.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.password}
                placeholder="••••••••"
                required
              />
              <LockClosedIcon className="absolute right-3 top-8 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            <div className="flex items-center justify-end">
              <Link to="/forgot-password" className="text-sm text-teal-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            <SubmitButton loading={submitting} className="w-full btn-lg mt-2">
              Sign in
            </SubmitButton>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="text-teal-600 font-medium hover:underline">
              Register now
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} VitalMEDS. All rights reserved.
        </p>
      </div>
    </div>
  );
}

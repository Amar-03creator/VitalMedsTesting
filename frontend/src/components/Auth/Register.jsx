import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CloudArrowUpIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import useAuth from '../../hooks/useAuth.js';
import useForm from '../../hooks/useForm.js';
import { FormField, FormSelect, SubmitButton } from '../Common/Form.jsx';

const validate = (v) => {
  const e = {};
  if (!v.fullName)                          e.fullName    = 'Full name is required';
  if (!v.email)                             e.email       = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email))
                                            e.email       = 'Invalid email address';
  if (!v.password)                          e.password    = 'Password is required';
  else if (v.password.length < 8)           e.password    = 'Minimum 8 characters';
  if (v.password !== v.confirmPassword)     e.confirmPassword = 'Passwords do not match';
  if (!v.companyName)                       e.companyName = 'Company name is required';
  if (!v.phone)                             e.phone       = 'Phone number is required';
  return e;
};

const STATES = ['Maharashtra','Delhi','Karnataka','Tamil Nadu','Gujarat','Rajasthan','Uttar Pradesh','West Bengal','Telangana','Andhra Pradesh','Other'];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState('');

  const { values, errors, submitting, handleChange, handleBlur, handleSubmit } = useForm(
    {
      fullName: '', email: '', password: '', confirmPassword: '',
      companyName: '', phone: '', gstNumber: '', state: '',
      drugLicense: null, gstCertificate: null,
    },
    validate
  );

  const onSubmit = handleSubmit(async (data) => {
    setApiError('');
    const result = await register(data);
    if (result.success) {
      setSuccess(true);
    } else {
      setApiError(result.error || 'Registration failed. Please try again.');
    }
  });

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md card p-10 text-center">
          <CheckCircleIcon className="w-16 h-16 text-teal-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
          <p className="text-gray-500 mb-6">
            Please check your email to verify your account. Once verified, our team will review
            your KYC documents and activate your account within 24 hours.
          </p>
          <Link to="/login" className="btn btn-primary btn-lg w-full justify-center">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-teal-600 rounded-2xl shadow-lg mb-3">
            <span className="text-white font-bold text-xl">V</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Vital<span className="text-teal-600">MEDS</span>
          </h1>
          <p className="text-gray-500 mt-1 text-sm">Create your distributor account</p>
        </div>

        <div className="card p-8">
          {apiError && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {apiError}
            </div>
          )}

          <form onSubmit={onSubmit} noValidate>
            <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              Personal &amp; Business Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <FormField label="Full Name" name="fullName" value={values.fullName} onChange={handleChange} onBlur={handleBlur} error={errors.fullName} placeholder="Dr. Ramesh Kumar" required />
              <FormField label="Email Address" name="email" type="email" value={values.email} onChange={handleChange} onBlur={handleBlur} error={errors.email} placeholder="you@company.com" required />
              <FormField label="Password" name="password" type="password" value={values.password} onChange={handleChange} onBlur={handleBlur} error={errors.password} placeholder="Min. 8 characters" required />
              <FormField label="Confirm Password" name="confirmPassword" type="password" value={values.confirmPassword} onChange={handleChange} onBlur={handleBlur} error={errors.confirmPassword} placeholder="Repeat password" required />
              <FormField label="Company / Pharmacy Name" name="companyName" value={values.companyName} onChange={handleChange} onBlur={handleBlur} error={errors.companyName} placeholder="ABC Pharmaceuticals Pvt Ltd" required />
              <FormField label="Phone Number" name="phone" type="tel" value={values.phone} onChange={handleChange} onBlur={handleBlur} error={errors.phone} placeholder="+91 9876543210" required />
              <FormField label="GST Number" name="gstNumber" value={values.gstNumber} onChange={handleChange} onBlur={handleBlur} error={errors.gstNumber} placeholder="22AAAAA0000A1Z5" />
              <FormSelect label="State" name="state" value={values.state} onChange={handleChange} onBlur={handleBlur} error={errors.state} options={STATES} placeholder="Select state" />
            </div>

            <h3 className="font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
              KYC Documents
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="form-label">Drug License <span className="text-red-500">*</span></label>
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-teal-400 transition-colors">
                  <CloudArrowUpIcon className="w-6 h-6 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {values.drugLicense?.[0]?.name || 'Upload Drug License (PDF/JPG)'}
                  </span>
                  <input type="file" name="drugLicense" accept=".pdf,.jpg,.jpeg,.png" onChange={handleChange} className="sr-only" />
                </label>
              </div>
              <div>
                <label className="form-label">GST Certificate</label>
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-teal-400 transition-colors">
                  <CloudArrowUpIcon className="w-6 h-6 text-gray-400" />
                  <span className="text-sm text-gray-500">
                    {values.gstCertificate?.[0]?.name || 'Upload GST Certificate (PDF/JPG)'}
                  </span>
                  <input type="file" name="gstCertificate" accept=".pdf,.jpg,.jpeg,.png" onChange={handleChange} className="sr-only" />
                </label>
              </div>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              By registering, you agree to VitalMEDS terms of service and privacy policy. KYC documents will be reviewed within 24 hours.
            </p>

            <SubmitButton loading={submitting} className="w-full btn-lg">
              Create Account
            </SubmitButton>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-600 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

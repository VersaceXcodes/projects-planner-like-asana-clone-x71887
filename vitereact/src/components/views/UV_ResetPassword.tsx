import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';

const UV_ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationErrors, setValidationErrors] = useState<{
    new_password?: string;
    confirm_password?: string;
  }>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate inputs whenever they change
  const validateInputs = (): boolean => {
    const errs: typeof validationErrors = {};
    if (!newPassword) {
      errs.new_password = 'New password is required';
    } else if (newPassword.length < 8) {
      errs.new_password = 'Password must be at least 8 characters';
    }
    if (!confirmPassword) {
      errs.confirm_password = 'Please confirm your new password';
    } else if (confirmPassword !== newPassword) {
      errs.confirm_password = 'Passwords do not match';
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  useEffect(() => {
    validateInputs();
  }, [newPassword, confirmPassword]);

  // If no token provided, show immediate error
  useEffect(() => {
    if (!token) {
      setErrorMessage('Invalid or missing reset token.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!validateInputs()) {
      return;
    }
    if (!token) {
      setErrorMessage('Invalid or missing reset token.');
      return;
    }
    setIsSubmitting(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/api/auth/reset_password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, new_password: newPassword })
        }
      );
      if (!resp.ok) {
        const data = await resp.json();
        setErrorMessage(data.message || 'Failed to reset password.');
      } else {
        navigate('/log-in', { replace: true });
      }
    } catch {
      setErrorMessage('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Reset Password</h1>
        <p className="mb-6 text-gray-600">
          Page for setting a new password using a secure token.
        </p>
        {errorMessage && (
          <p className="mb-4 text-red-500">{errorMessage}</p>
        )}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="new_password"
              className="block text-gray-700 mb-1"
            >
              New Password
            </label>
            <input
              id="new_password"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              onBlur={validateInputs}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded ${
                validationErrors.new_password
                  ? 'border-red-500'
                  : 'border-gray-300'
              } focus:outline-none focus:ring ${
                validationErrors.new_password
                  ? 'focus:ring-red-300'
                  : 'focus:ring-blue-300'
              }`}
            />
            {validationErrors.new_password && (
              <p className="text-red-500 mt-1">
                {validationErrors.new_password}
              </p>
            )}
          </div>

          <div className="mb-6">
            <label
              htmlFor="confirm_password"
              className="block text-gray-700 mb-1"
            >
              Confirm Password
            </label>
            <input
              id="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              onBlur={validateInputs}
              disabled={isSubmitting}
              className={`w-full px-3 py-2 border rounded ${
                validationErrors.confirm_password
                  ? 'border-red-500'
                  : 'border-gray-300'
              } focus:outline-none focus:ring ${
                validationErrors.confirm_password
                  ? 'focus:ring-red-300'
                  : 'focus:ring-blue-300'
              }`}
            />
            {validationErrors.confirm_password && (
              <p className="text-red-500 mt-1">
                {validationErrors.confirm_password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={
              isSubmitting || Object.keys(validationErrors).length > 0
            }
            className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting && (
              <svg
                className="animate-spin h-5 w-5 mr-2 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
            )}
            {isSubmitting ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/log-in"
            className="text-blue-600 hover:underline"
          >
            Back to Log In
          </Link>
        </div>
      </div>
    </>
  );
};

export default UV_ResetPassword;
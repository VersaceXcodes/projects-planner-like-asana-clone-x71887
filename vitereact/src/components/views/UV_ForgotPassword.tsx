import React, { useState, FormEvent } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

const UV_ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [confirmationSent, setConfirmationSent] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const validateEmail = (value: string) => {
    // simple email regex
    return /\S+@\S+\.\S+/.test(value);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!validateEmail(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      await axios.post('/api/auth/forgot_password', { email: email.trim() });
      // Backend always returns 200 with generic message
      setConfirmationSent(true);
    } catch (err: any) {
      console.error('ForgotPasswordError:', err);
      // Generic error to avoid leaking registration status
      setErrorMessage('Something went wrong. Please try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-semibold text-center mb-4">Forgot Password</h1>
          <p className="text-gray-600 text-center mb-6">
            {confirmationSent
              ? 'Check your email for a reset link.'
              : 'Enter your email to receive a password reset link.'}
          </p>

          {!confirmationSent && (
            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
                  required
                />
                {errorMessage && (
                  <p className="mt-2 text-sm text-red-600">{errorMessage}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/log-in"
              className="text-blue-600 hover:underline"
            >
              Back to Log In
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_ForgotPassword;
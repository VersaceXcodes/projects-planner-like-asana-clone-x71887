import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';

const UV_EmailVerificationPrompt: React.FC = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  // Extract token from URL params
  const query = new URLSearchParams(search);
  const initialToken = query.get('token') ?? '';

  // State variables
  const [token] = useState<string>(initialToken);
  const [verified, setVerified] = useState<boolean>(false);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resendInProgress, setResendInProgress] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const RESEND_COOLDOWN_SECONDS = 60;

  // Verify email token with backend
  const checkEmailVerification = async () => {
    if (!token) {
      setErrorMessage('Invalid or missing verification token.');
      return;
    }
    try {
      setErrorMessage(null);
      await axios.post<{ message: string }>('/api/auth/verify_email', { token });
      setVerified(true);
    } catch (err: any) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Verification failed. Please try again.';
      setErrorMessage(msg);
      setVerified(false);
    }
  };

  // Resend verification email with cooldown
  const resendVerification = async () => {
    if (!token || resendCooldown > 0) return;
    setResendInProgress(true);
    setErrorMessage(null);
    try {
      await axios.post('/api/auth/resend_verification', { token });
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      const msg =
        axios.isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Failed to resend verification email.';
      setErrorMessage(msg);
    } finally {
      setResendInProgress(false);
    }
  };

  // Cooldown timer decrement
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // On mount, attempt verification
  useEffect(() => {
    checkEmailVerification();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <div className="flex flex-col items-center justify-center h-full px-4 py-8">
        <div className="w-full max-w-md bg-white shadow-md rounded-lg p-8">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">
            Verify Your Email
          </h1>
          {!verified && (
            <p className="text-gray-700 mb-4">
              We’ve sent a verification link to your email address. Please
              click the link in that email to verify your account.
            </p>
          )}
          {verified && (
            <p className="text-green-600 mb-4">
              Your email has been successfully verified! You can now log in.
            </p>
          )}
          {errorMessage && (
            <p className="text-red-600 mb-4">{errorMessage}</p>
          )}
          <div className="flex space-x-2">
            <button
              onClick={resendVerification}
              disabled={resendCooldown > 0 || resendInProgress}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resendInProgress
                ? 'Resending...'
                : resendCooldown > 0
                ? `Resend in ${resendCooldown}s`
                : 'Resend Verification Email'}
            </button>
            <button
              onClick={async () => {
                if (!verified) {
                  await checkEmailVerification();
                }
                if (verified) {
                  navigate('/log-in');
                }
              }}
              disabled={!verified}
              className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Proceed to Log In
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_EmailVerificationPrompt;
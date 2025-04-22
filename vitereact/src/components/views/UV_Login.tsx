import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAppDispatch, set_auth, set_workspaces } from '@/store/main';

const UV_Login: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirect = searchParams.get('redirect');
  const inviteToken = searchParams.get('token');

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [show_password, setShowPassword] = useState<boolean>(false);
  const [error_message, setErrorMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      // 1. Authenticate
      const resp = await axios.post('/api/auth/log_in', { email, password });
      const { token, user } = resp.data as { token: string; user: any };

      // 2. Store auth in Redux (also sets axios auth header)
      dispatch(set_auth({ token, user }));

      // 3. Fetch workspaces and store
      const wsResp = await axios.get('/api/workspaces');
      const workspaces = wsResp.data as Array<any>;
      dispatch(set_workspaces(workspaces));

      // 4. Route based on context
      if (redirect === 'accept-invite' && inviteToken) {
        navigate(`/accept-invite?token=${inviteToken}`);
      } else if (workspaces.length === 0) {
        navigate('/workspace-creation');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      // Parse error message
      if (axios.isAxiosError(err)) {
        const data = err.response?.data as any;
        setErrorMessage(data?.message || data?.error || 'Login failed');
      } else {
        setErrorMessage('Login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
          <h2 className="mb-6 text-2xl font-semibold text-center">Log In</h2>
          {error_message && (
            <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 border border-red-200 rounded">
              {error_message}
            </div>
          )}
          <form onSubmit={submitLogin} noValidate>
            <div className="mb-4">
              <label htmlFor="email" className="block mb-1 text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoFocus
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
              />
            </div>
            <div className="mb-6">
              <label htmlFor="password" className="block mb-1 text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={show_password ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring focus:border-blue-300"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 focus:outline-none"
                  tabIndex={-1}
                >
                  {show_password ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Logging In...' : 'Log In'}
            </button>
          </form>
          <div className="flex justify-between mt-4 text-sm text-blue-600">
            <Link to="/forgot-password" className="hover:underline">
              Forgot Password?
            </Link>
            <Link to="/sign-up" className="hover:underline">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default UV_Login;
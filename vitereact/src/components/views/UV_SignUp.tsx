import React, { useState, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';

const UV_SignUp: React.FC = () => {
  const [full_name, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirm_password, setConfirmPassword] = useState<string>('');
  const [show_password, setShowPassword] = useState<boolean>(false);
  const [validation_errors, setValidationErrors] = useState<{
    full_name?: string;
    email?: string;
    password?: string;
    confirm_password?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const navigate = useNavigate();

  // Validate fields; can pass overrides or default to current state
  const validateInputs = ({
    full_name: fn = full_name,
    email: em = email,
    password: pw = password,
    confirm_password: cpw = confirm_password
  }: {
    full_name?: string;
    email?: string;
    password?: string;
    confirm_password?: string;
  } = {}) => {
    const errs: {
      full_name?: string;
      email?: string;
      password?: string;
      confirm_password?: string;
    } = {};
    if (!fn.trim()) {
      errs.full_name = 'Full name is required';
    }
    if (!em.trim()) {
      errs.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      errs.email = 'Invalid email address';
    }
    if (!pw) {
      errs.password = 'Password is required';
    } else if (pw.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }
    if (!cpw) {
      errs.confirm_password = 'Please confirm your password';
    } else if (cpw !== pw) {
      errs.confirm_password = 'Passwords do not match';
    }
    setValidationErrors(errs);
    return errs;
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleFullNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setFullName(v);
    validateInputs({ full_name: v });
  };
  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setEmail(v);
    validateInputs({ email: v });
  };
  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setPassword(v);
    validateInputs({ password: v });
  };
  const handleConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setConfirmPassword(v);
    validateInputs({ confirm_password: v });
  };

  // Disable if any errors or fields blank or during submission
  const hasErrors = () => {
    const errs = validateInputs();
    return (
      Object.keys(errs).length > 0 ||
      !full_name.trim() ||
      !email.trim() ||
      !password ||
      !confirm_password
    );
  };

  const submitSignUp = async () => {
    // final validation
    const errs = validateInputs();
    if (Object.keys(errs).length) return;

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const resp = await axios.post('/api/auth/sign_up', {
        name: full_name,
        email,
        password
      });
      // per datamap, assume the server returns a `token`
      const token = (resp.data as any).token;
      navigate(`/verify-email?token=${token}`, { replace: true });
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        const msg = error.response.data?.message;
        setErrorMsg(typeof msg === 'string' ? msg : 'Sign up failed');
      } else {
        setErrorMsg('Sign up failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submitSignUp();
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign Up
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                to="/log-in"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                Log In
              </Link>
            </p>
          </div>

          {errorMsg && (
            <p className="text-red-600 text-sm text-center">{errorMsg}</p>
          )}

          <form className="mt-8 space-y-6" onSubmit={onSubmit}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="full_name" className="sr-only">
                  Full Name
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  autoComplete="name"
                  value={full_name}
                  onChange={handleFullNameChange}
                  onBlur={() => validateInputs()}
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 
                             placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 
                             focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Full Name"
                />
                {validation_errors.full_name && (
                  <p className="mt-2 text-sm text-red-600">
                    {validation_errors.full_name}
                  </p>
                )}
              </div>

              <div className="mt-4">
                <label htmlFor="email" className="sr-only">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => validateInputs()}
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 
                             placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 
                             focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Email address"
                />
                {validation_errors.email && (
                  <p className="mt-2 text-sm text-red-600">
                    {validation_errors.email}
                  </p>
                )}
              </div>

              <div className="mt-4 relative">
                <label htmlFor="password" className="sr-only">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type={show_password ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={handlePasswordChange}
                  onBlur={() => validateInputs()}
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 
                             placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 
                             focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-600 hover:text-gray-900"
                >
                  {show_password ? 'Hide' : 'Show'}
                </button>
                {validation_errors.password && (
                  <p className="mt-2 text-sm text-red-600">
                    {validation_errors.password}
                  </p>
                )}
              </div>

              <div className="mt-4 relative">
                <label htmlFor="confirm_password" className="sr-only">
                  Confirm Password
                </label>
                <input
                  id="confirm_password"
                  name="confirm_password"
                  type={show_password ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm_password}
                  onChange={handleConfirmPasswordChange}
                  onBlur={() => validateInputs()}
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 
                             placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 
                             focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Confirm Password"
                />
                {validation_errors.confirm_password && (
                  <p className="mt-2 text-sm text-red-600">
                    {validation_errors.confirm_password}
                  </p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isSubmitting || hasErrors()}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium 
                           rounded-md text-white ${
                             isSubmitting || hasErrors()
                               ? 'bg-gray-400 cursor-not-allowed'
                               : 'bg-indigo-600 hover:bg-indigo-700'
                           } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
              >
                {isSubmitting ? 'Signing Up...' : 'Sign Up'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default UV_SignUp;
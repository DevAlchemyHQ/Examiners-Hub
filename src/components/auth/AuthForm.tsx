import React, { useState, useCallback } from 'react';
import { Mail, Lock, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

type AuthMode = 'signin' | 'signup' | 'reset';

export const AuthForm: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const setAuth = useAuthStore((state) => state.setAuth);

  const validateForm = useCallback(() => {
    // Clear previous errors
    setError(null);

    // Email validation
    if (!email.trim()) {
      setError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return false;
    }

    // Password validation
    if (!password.trim()) {
      setError('Password is required');
      return false;
    }
    if (mode === 'signup') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        return false;
      }
      // Add more password requirements as needed
      const hasUpperCase = /[A-Z]/.test(password);
      const hasLowerCase = /[a-z]/.test(password);
      const hasNumbers = /\d/.test(password);
      if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
        setError('Password must contain uppercase, lowercase, and numbers');
        return false;
      }
    }

    return true;
  }, [email, password, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      switch (mode) {
        case 'signin':
          const signInResult = await signInWithEmail(email, password);
          if (signInResult) {
            setAuth(true);
          }
          break;

        case 'signup':
          await signUpWithEmail(email, password);
          setMessage('Account created! Please check your email to verify your account.');
          break;

        case 'reset':
          await resetPassword(email);
          setMessage('Password reset instructions have been sent to your email.');
          break;
      }
    } catch (err) {
      console.error('Auth error:', err);
      if (err instanceof Error) {
        // Handle specific error messages
        const errorMsg = err.message.toLowerCase();
        if (errorMsg.includes('invalid login credentials')) {
          setError('Invalid email or password');
        } else if (errorMsg.includes('email not confirmed')) {
          setError('Please verify your email address before signing in');
        } else if (errorMsg.includes('already registered')) {
          setError('An account with this email already exists');
        } else if (errorMsg.includes('rate limit')) {
          setError('Too many attempts. Please try again later');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {mode === 'signin' ? 'Welcome back' : 
               mode === 'signup' ? 'Create account' : 
               'Reset password'}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {mode === 'signin' ? 'Sign in to your account' :
               mode === 'signup' ? 'Sign up for a new account' :
               'Enter your email to reset password'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>

            {mode !== 'reset' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                    minLength={mode === 'signup' ? 8 : undefined}
                  />
                  <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {message && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                <div className="h-2 w-2 bg-green-600 rounded-full" />
                <p className="text-sm">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'signin' ? 'Sign in' :
                     mode === 'signup' ? 'Sign up' :
                     'Reset password'}
                  </span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-2">
            {mode === 'signin' && (
              <>
                <button
                  onClick={() => setMode('reset')}
                  className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
                >
                  Forgot your password?
                </button>
                <button
                  onClick={() => setMode('signup')}
                  className="text-sm text-gray-600 hover:text-gray-500 dark:text-gray-400"
                >
                  Don't have an account? Sign up
                </button>
              </>
            )}
            {mode === 'signup' && (
              <button
                onClick={() => setMode('signin')}
                className="text-sm text-gray-600 hover:text-gray-500 dark:text-gray-400"
              >
                Already have an account? Sign in
              </button>
            )}
            {mode === 'reset' && (
              <button
                onClick={() => setMode('signin')}
                className="text-sm text-gray-600 hover:text-gray-500 dark:text-gray-400"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
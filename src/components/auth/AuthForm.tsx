import React, { useState, useCallback } from 'react';
import { Mail, Lock, Loader2, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import './cyberpunk-auth.css';

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
    <div className="cyberpunk-auth">
      <div className="form">
        <h1>
          {mode === 'signin' ? 'Welcome back' : 
           mode === 'signup' ? 'Create account' : 
           'Reset password'}
        </h1>
        <p style={{ textAlign: 'center', marginBottom: '20px', color: '#ccc' }}>
          {mode === 'signin' ? 'Sign in to your account' :
           mode === 'signup' ? 'Sign up for a new account' :
           'Enter your email to reset password'}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="control">
            <div className="block-cube block-input">
              <div className="bg-top">
                <div className="bg-inner"></div>
              </div>
              <div className="bg-right">
                <div className="bg-inner"></div>
              </div>
              <div className="bg">
                <div className="bg-inner"></div>
              </div>
              <div className="text">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="Email address"
                  required
                />
              </div>
            </div>
          </div>

          {mode !== 'reset' && (
            <div className="control">
              <div className="block-cube block-input">
                <div className="bg-top">
                  <div className="bg-inner"></div>
                </div>
                <div className="bg-right">
                  <div className="bg-inner"></div>
                </div>
                <div className="bg">
                  <div className="bg-inner"></div>
                </div>
                <div className="text">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Password"
                    required
                    minLength={mode === 'signup' ? 8 : undefined}
                  />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {message && (
            <div className="success-message">
              {message}
            </div>
          )}

          <div className="control">
            <div className="block-cube block-cube-hover">
              <div className="bg-top">
                <div className="bg-inner"></div>
              </div>
              <div className="bg-right">
                <div className="bg-inner"></div>
              </div>
              <div className="bg">
                <div className="bg-inner"></div>
              </div>
              <div className="text">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn"
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
              </div>
            </div>
          </div>
        </form>

        <div className="form-links">
          {mode === 'signin' && (
            <>
              <button
                onClick={() => setMode('reset')}
              >
                Forgot your password?
              </button>
              <br />
              <span>Don't have an account?{' '}</span>
              <button
                onClick={() => setMode('signup')}
              >
                Sign up
              </button>
            </>
          )}
          {mode === 'signup' && (
            <>
              <span>Already have an account?{' '}</span>
              <button
                onClick={() => setMode('signin')}
              >
                Sign in
              </button>
            </>
          )}
          {mode === 'reset' && (
            <>
              <span>Back to{' '}</span>
              <button
                onClick={() => setMode('signin')}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
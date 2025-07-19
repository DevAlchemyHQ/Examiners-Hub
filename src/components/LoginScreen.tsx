import React, { useState } from "react";
import { Eye, EyeOff, Loader2, AlertCircle, Mail, User, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { AuthService } from "../lib/services";
import { OTPVerification } from "./auth/OTPVerification";
import { SetNewPassword } from "./auth/SetNewPassword";
import { TermsModal } from "./auth/TermsModal";

const SUPPORT_EMAIL = 'infor@exametry.xyz';

type AuthMode = 'signin' | 'signup' | 'reset' | 'verify-signup' | 'verify-reset' | 'set-password';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth, setUser } = useAuthStore();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      switch (mode) {
        case 'signin':
          const signinResult = await AuthService.signInWithEmail(email, password);
          if (signinResult.user && !signinResult.error) {
            setAuth(true);
            setUser(signinResult.user);
            navigate('/dashboard');
          } else {
            setError('Invalid email or password');
          }
          break;
        case 'signup':
          if (!acceptedTerms) {
            setError('Please accept the terms and conditions');
            return;
          }
          const signupResult = await AuthService.signUpWithEmail(email, password, fullName);
          if (signupResult.user && !signupResult.error) {
            setAuth(true);
            setUser(signupResult.user);
            navigate('/dashboard');
          } else {
            setError('Signup failed. Please try again.');
          }
          break;
        case 'reset':
          await AuthService.resetPassword(email);
          setMode('verify-reset');
          setMessage('Please enter the verification code sent to your email.');
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (otp: string) => {
    try {
      if (mode === 'verify-signup') {
        const result = await AuthService.verifyOTP(email, otp);
        if (result.user && !result.error) {
          setAuth(true);
          setUser(result.user);
          navigate('/dashboard');
        } else {
          throw new Error('Verification failed');
        }
      } else if (mode === 'verify-reset') {
        await AuthService.verifyResetOTP(email, otp, password);
        setMode('set-password');
      }
    } catch (err) {
      throw err instanceof Error ? err : new Error('Verification failed');
    }
  };

  const handleEmailClick = () => {
    window.location.href = `mailto:${SUPPORT_EMAIL}`;
  };

  if (mode === 'set-password') {
    return <SetNewPassword />;
  }

  if (mode === 'verify-signup' || mode === 'verify-reset') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-6">
        <div className="bg-gray-800/90 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-700 backdrop-blur-lg">
          <OTPVerification
            email={email}
            type={mode === 'verify-signup' ? 'signup' : 'reset'}
            onVerify={handleVerifyOTP}
            onBack={() => setMode(mode === 'verify-signup' ? 'signup' : 'reset')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="bg-gray-800/90 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-700 backdrop-blur-lg">
        <div className="flex justify-center mb-6">
          <span className="text-5xl">🪶</span>
        </div>
        <h1 className="text-3xl font-extrabold text-center mb-6 text-white tracking-wide">
          Welcome to <span className="text-indigo-400">Exametry</span>
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'signup' && (
            <div className="relative">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white pr-10 transition-all focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-gray-400"
                placeholder="Enter your full name"
                required
              />
              <User className="absolute right-3 top-3 text-gray-400" size={20} />
            </div>
          )}

          <div className="relative">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white pr-10 transition-all focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-gray-400"
              placeholder="Enter your email"
              required
            />
            <Mail className="absolute right-3 top-3 text-gray-400" size={20} />
          </div>

          {mode !== 'reset' && (
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white pr-10 transition-all focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-gray-400"
                placeholder="Enter your password"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-gray-400 hover:text-white transition"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          )}

          {mode === 'signup' && (
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="terms" className="text-sm text-gray-300">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                  className="text-indigo-400 hover:text-indigo-300 transition"
                >
                  Terms and Conditions
                </button>
              </label>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {message && (
            <div className="flex items-center gap-2 text-green-400 bg-green-400/10 p-3 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span className="text-sm">{message}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-500 text-white py-3 rounded-lg font-semibold hover:bg-indigo-600 transition flex items-center justify-center gap-2 shadow-md"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                {mode === 'signin' ? 'Signing in...' :
                 mode === 'signup' ? 'Creating account...' :
                 'Sending reset email...'}
              </>
            ) : (
              mode === 'signin' ? 'Sign In' :
              mode === 'signup' ? 'Create Account' :
              'Reset Password'
            )}
          </button>
        </form>

        <div className="mt-6 flex flex-col gap-2 text-center">
          {mode === 'signin' ? (
            <>
              <button
                onClick={() => setMode('reset')}
                className="text-sm text-indigo-400 hover:text-indigo-300 transition"
              >
                Forgot your password?
              </button>
              <div className="text-gray-400 text-sm">
                Don't have an account?{' '}
                <button
                  onClick={() => setMode('signup')}
                  className="text-indigo-400 hover:text-indigo-300 transition"
                >
                  Sign up
                </button>
              </div>
            </>
          ) : mode === 'signup' ? (
            <div className="text-gray-400 text-sm">
              Already have an account?{' '}
              <button
                onClick={() => setMode('signin')}
                className="text-indigo-400 hover:text-indigo-300 transition"
              >
                Sign in
              </button>
            </div>
          ) : (
            <div className="text-gray-400 text-sm">
              Remember your password?{' '}
              <button
                onClick={() => setMode('signin')}
                className="text-indigo-400 hover:text-indigo-300 transition"
              >
                Sign in
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700">
          <div className="text-center text-gray-400 text-sm">
            Need help?{' '}
            <button
              onClick={handleEmailClick}
              className="text-indigo-400 hover:text-indigo-300 transition"
            >
              Contact support
            </button>
          </div>
        </div>
      </div>

      {showTerms && (
        <TermsModal onClose={() => setShowTerms(false)} />
      )}
    </div>
  );
};
import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, AlertCircle, Mail, User, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { AuthService, ProfileService } from "../lib/services";
import { VerificationService } from "../lib/verificationService";
import { OTPVerification } from "./auth/OTPVerification";
import { EmailVerification } from "./auth/EmailVerification";
import { ForgotPassword } from "./auth/ForgotPassword";
import { SetNewPassword } from "./auth/SetNewPassword";
import { TermsModal } from "./auth/TermsModal";
import "./auth/cyberpunk-auth.css";

const SUPPORT_EMAIL = 'infor@exametry.xyz';

type AuthMode = 'signin' | 'signup' | 'reset' | 'verify-signup' | 'verify-reset' | 'set-password' | 'email-verification' | 'forgot-password';

export const LoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const { setAuth, setUser, isAuthenticated } = useAuthStore();
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

  // Check if user is already authenticated and redirect to main app
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app');
    }
  }, [isAuthenticated, navigate]);

  // Check for verified email when mode changes to signin
  useEffect(() => {
    if (mode === 'signin') {
      const verifiedEmail = localStorage.getItem('verifiedEmail');
      if (verifiedEmail) {
        setEmail(verifiedEmail);
        localStorage.removeItem('verifiedEmail'); // Clear it after using
      }
    }
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      switch (mode) {
        case 'signin':
          const signinResult = await AuthService.signInWithEmail(email, password);
          if (signinResult.user && !signinResult.error) {
            // Store session data for persistence
            if (signinResult.session) {
              localStorage.setItem('session', JSON.stringify(signinResult.session));
            }
            localStorage.setItem('userEmail', email);
            
            // Load profile data to get avatar_url and other metadata
            try {
              const profileResult = await ProfileService.getOrCreateUserProfile(signinResult.user.id, email);
              if (profileResult) {
                // Update user with profile data including avatar_url
                const updatedUser = {
                  ...signinResult.user,
                  user_metadata: {
                    ...signinResult.user.user_metadata,
                    avatar_url: profileResult.avatar_url,
                    subscription_plan: (profileResult as any).subscription_plan || 'Basic',
                    subscription_status: (profileResult as any).subscription_status || 'active',
                    subscription_end_date: (profileResult as any).subscription_end_date || null
                  }
                };
                setUser(updatedUser);
              } else {
                setUser(signinResult.user);
              }
            } catch (profileError) {
              console.error('Error loading profile data:', profileError);
              // Still set user even if profile loading fails
              setUser(signinResult.user);
            }
            
            // Update auth state
            setAuth(true);
            
            // Force a small delay to ensure state updates
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Then navigate
            navigate('/app');
          } else {
            // Display the specific error message from AWS
            const errorMessage = signinResult.error?.message || 'Invalid email or password';
            setError(errorMessage);
          }
          break;
        case 'signup':
          console.log('🚀 NEW CODE VERSION - LoginScreen signup case');
          if (!acceptedTerms) {
            setError('Please accept the terms and conditions');
            return;
          }
          try {
            const signupResult = await AuthService.signUpWithEmail(email, password, fullName);
            if (signupResult.user && !signupResult.error) {
              // Store session data for persistence
              if (signupResult.session) {
                localStorage.setItem('session', JSON.stringify(signupResult.session));
              }
              localStorage.setItem('userEmail', email);
              
              // Send verification email
              try {
                const verificationResult = await VerificationService.sendVerificationEmail(email, signupResult.user.id);
                if (verificationResult.success) {
                  // Switch to email verification mode
                  setMode('email-verification');
                  setMessage('Please check your email and enter the 6-digit OTP code.');
                  // If in development mode, show the code in console
                  if (verificationResult.code) {
                    console.log('🔐 DEVELOPMENT MODE - Verification Code:', verificationResult.code);
                  }
                } else {
                  // Handle verification service errors gracefully
                  if (verificationResult.message.includes('Credential is missing')) {
                    setError('Email service temporarily unavailable. Please try again later.');
                  } else {
                    setError(verificationResult.message);
                  }
                }
              } catch (verificationError: any) {
                console.error('Verification service error:', verificationError);
                // Handle verification service errors
                if (verificationError.message?.includes('Credential is missing')) {
                  setError('Email service temporarily unavailable. Please try again later.');
                } else {
                  setError('Failed to send verification email. Please try again.');
                }
              }
            } else {
              // Check for specific AWS Cognito errors
              const errorMessage = signupResult.error?.message || '';
              const errorType = signupResult.error?.type || '';
              
              if (errorType === 'USER_EXISTS_VERIFIED') {
                setError('An account with this email already exists and is verified. Please sign in instead.');
                // Clear the form to help user switch to signin
                setEmail('');
                setPassword('');
                setFullName('');
              } else if (errorType === 'USER_EXISTS_UNVERIFIED_WITH_CODE') {
                // User has a valid verification code - redirect to verification page
                setMode('email-verification');
                setMessage('Please check your email for the verification code and complete the signup process.');
              } else if (errorMessage.includes('UsernameExistsException')) {
                setError('An account with this email already exists. Please sign in instead.');
                // Clear the form to help user switch to signin
                setEmail('');
                setPassword('');
                setFullName('');
              } else if (errorMessage.includes('InvalidPasswordException')) {
                setError('Password must be at least 8 characters long and contain uppercase, lowercase, and special characters.');
              } else if (errorMessage.includes('InvalidParameterException')) {
                setError('Please check your email format and ensure all fields are filled correctly.');
              } else {
                setError('Please check your information and try again.');
              }
            }
          } catch (signupError: any) {
            console.error('Signup error caught:', signupError);
            
            // Handle any unexpected errors during signup
            setError('Please check your information and try again.');
          }
          break;
        case 'reset':
          setMode('forgot-password');
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
        // Use VerificationService for signup verification
        const result = await VerificationService.verifyCode(email, otp, 'verification');
        if (result.success) {
          // Load profile data to get avatar_url and other metadata
          try {
            const profileResult = await ProfileService.getOrCreateUserProfile(email, email);
            if (profileResult) {
              // Update user with profile data including avatar_url
              const updatedUser = {
                id: email,
                email: email,
                user_metadata: {
                  avatar_url: profileResult.avatar_url,
                  subscription_plan: (profileResult as any).subscription_plan || 'Basic',
                  subscription_status: (profileResult as any).subscription_status || 'active',
                  subscription_end_date: (profileResult as any).subscription_end_date || null
                }
              };
              setUser(updatedUser);
            } else {
              setUser({ id: email, email: email, user_metadata: {} });
            }
          } catch (profileError) {
            console.error('Error loading profile data:', profileError);
            // Still set user even if profile loading fails
            setUser({ id: email, email: email, user_metadata: {} });
          }
          
          // Update auth state
          setAuth(true);
          
          // Force a small delay to ensure state updates
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Then navigate
          navigate('/');
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

  if (mode === 'email-verification') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-6">
        <div className="bg-gray-800/90 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-700 backdrop-blur-lg">
          <EmailVerification
            email={email}
            userId={localStorage.getItem('userEmail') || ''}
            onVerificationSuccess={() => {
              // Store the verified email for pre-filling
              localStorage.setItem('verifiedEmail', email);
              // Go back to signin mode with the email pre-filled
              setMode('signin');
              setMessage('Email verified successfully! Please sign in with your password.');
            }}
            onBack={() => setMode('signin')}
          />
        </div>
      </div>
    );
  }

  if (mode === 'forgot-password') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-6">
        <div className="bg-gray-800/90 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-700 backdrop-blur-lg">
          <ForgotPassword
            onBack={() => setMode('signin')}
            onSuccess={() => setMode('signin')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="cyberpunk-auth">
      <div className="form">
        <div className="logo-container">
          <img 
            src="/feather-logo.svg" 
            alt="Exametry Logo" 
            className="logo-image"
            style={{
              width: '120px',
              height: 'auto'
            }}
          />
          <h1>Welcome to Exametry</h1>
        </div>
        
        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
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
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>
            </div>
          )}

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
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
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
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter your password"
                    required
                    minLength={8}
                  />
                </div>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="checkbox-group">
              <input
                type="checkbox"
                id="terms"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <label htmlFor="terms">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={() => setShowTerms(true)}
                >
                  Terms and Conditions
                </button>
              </label>
            </div>
          )}

          {error && (
            <div className="error-message">
              {error}
              {error.includes('No account found') && (
                <div className="mt-2 text-sm text-slate-600 dark:text-gray-400">
                  <p>💡 Don't have an account? <button onClick={() => setMode('signup')} className="text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">Sign up here</button></p>
                </div>
              )}
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
                  disabled={isLoading}
                  className="btn"
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
              </div>
            </div>
          </div>
        </form>

        <div className="form-links">
          {mode === 'signin' ? (
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
          ) : mode === 'signup' ? (
            <>
              <span>Already have an account?{' '}</span>
              <button
                onClick={() => setMode('signin')}
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              <span>Remember your password?{' '}</span>
              <button
                onClick={() => setMode('signin')}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <div className="credits">
          <button
            onClick={handleEmailClick}
          >
            Need help? Contact support
          </button>
        </div>
      </div>

      {showTerms && (
        <TermsModal onClose={() => setShowTerms(false)} />
      )}
    </div>
  );
};
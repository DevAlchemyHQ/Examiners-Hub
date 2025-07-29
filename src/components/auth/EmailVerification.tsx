import React, { useState, useEffect } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { VerificationCodeInput } from './VerificationCodeInput';
import { AuthService } from '../../lib/services';
import { useAuthStore } from '../../store/authStore';
import '../auth/cyberpunk-auth.css';

interface EmailVerificationProps {
  email: string;
  userId: string;
  onVerificationSuccess: () => void;
  onBack: () => void;
}

export const EmailVerification: React.FC<EmailVerificationProps> = ({
  email,
  userId,
  onVerificationSuccess,
  onBack
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [emailSent, setEmailSent] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);

  const { setUser, setAuth } = useAuthStore();

  // Send verification email on component mount
  useEffect(() => {
    sendVerificationEmail();
  }, []);

  const sendVerificationEmail = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Use Cognito's built-in resend confirmation code
      const result = await AuthService.resendVerificationEmail(email);
      
      if (result.success) {
        setEmailSent(true);
        setSuccess('Verification code sent! Check your email for the 6-digit code from AWS Cognito.');
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.message || 'Failed to send verification code. Please try again.');
      }
    } catch (err: any) {
      console.error('Resend verification error:', err);
      setError('Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (code: string) => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // Use Cognito's built-in confirmation with verification code
      const result = await AuthService.confirmUserWithCode(email, code);
      
      if (result.success) {
        setSuccess('Email verified successfully!');
        setVerificationAttempts(0);
        
        // Update user verification status
        const currentUser = useAuthStore.getState().user;
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            user_metadata: {
              ...currentUser.user_metadata,
              email_verified: true
            }
          };
          setUser(updatedUser);
        }
        
        // Redirect after a short delay
        setTimeout(() => {
          onVerificationSuccess();
        }, 1500);
      } else {
        setError('Email verification failed. Please try again.');
        setVerificationAttempts(prev => prev + 1);
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      // Handle specific Cognito errors
      if (err.message?.includes('User cannot be confirmed')) {
        setError('Email already verified. Please proceed to login.');
        setTimeout(() => {
          onVerificationSuccess();
        }, 1500);
      } else if (err.message?.includes('CodeMismatchException')) {
        setError('Invalid verification code. Please check your email and try again.');
        setVerificationAttempts(prev => prev + 1);
      } else {
        setError('Email verification failed. Please try again.');
        setVerificationAttempts(prev => prev + 1);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (verificationAttempts >= 3) {
      setError('Too many OTP attempts. Please wait before trying again.');
      return;
    }
    
    await sendVerificationEmail();
  };

  return (
    <div className="cyberpunk-auth">
      <div className="form">
        <h1>Verify your email</h1>
        
        {/* Error Display */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        {/* Email Status */}
        {emailSent && (
          <div className="success-message">
            Verification OTP sent successfully
          </div>
        )}

        {/* Simple Email Info */}
        <div className="text-center mb-6">
          <p className="text-slate-600 dark:text-gray-400">
            We've sent a 6-digit OTP code to
          </p>
          <p className="font-medium text-slate-900 dark:text-white">
            {email}
          </p>
        </div>

        {/* Verification Code Input */}
        <div className="control">
          <VerificationCodeInput
            onCodeSubmit={handleCodeSubmit}
            onResendCode={handleResendCode}
            isLoading={isLoading}
            error={error}
            success={success}
            codeLength={6}
            autoFocus={true}
          />
        </div>

        {/* Back Button */}
        <div className="control">
          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="block-cube block-cube-hover"
          >
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
              <div className="flex items-center gap-2 justify-center">
                <ArrowLeft size={16} />
                Back to login
              </div>
            </div>
          </button>
        </div>

        {/* Help Text */}
        <div className="text-center text-xs text-slate-500 dark:text-gray-500 space-y-1 mt-4">
          <p>Check your spam folder if you don't see the email</p>
          <p>OTP code expires in 1 hour</p>
        </div>
      </div>
    </div>
  );
}; 
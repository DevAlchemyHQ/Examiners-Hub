import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { VerificationCodeInput } from './VerificationCodeInput';
import { VerificationService } from '../../lib/verificationService';
import { AuthService } from '../../lib/services';
import '../auth/cyberpunk-auth.css';

interface ForgotPasswordProps {
  onBack: () => void;
  onSuccess: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onBack,
  onSuccess
}) => {
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSendResetEmail = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // Use AWS Cognito's built-in password reset
      const result = await AuthService.resetPassword(email);
      
      if (!result.error) {
        setStep('code');
        setSuccess('Password reset code sent! Check your email.');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        // Display the specific error message from AWS
        const errorMessage = result.error.message || 'Failed to send password reset email. Please try again.';
        setError(errorMessage);
      }
    } catch (err) {
      setError('Failed to send password reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (code: string) => {
    setIsLoading(true);
    setError('');
    
    try {
      // Store the code for the next step
      setUserId(code); // Temporarily store the code
      setStep('password');
      setSuccess('Code verified! Now set your new password.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to verify code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // Use AWS Cognito to confirm password reset
      const result = await AuthService.verifyResetOTP(email, userId, newPassword);
      
      if (!result.error) {
        setSuccess('Password reset successfully! You can now login with your new password.');
        setTimeout(() => {
          onSuccess();
        }, 2000);
      } else {
        // Display the specific error message from AWS
        const errorMessage = result.error.message || 'Failed to reset password. Please try again.';
        setError(errorMessage);
      }
    } catch (err) {
      setError('Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    await handleSendResetEmail();
  };

  return (
    <div className="cyberpunk-auth">
      <div className="form">
        <h1>Reset your password</h1>
        
        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="text-red-400 font-medium mb-3">
              {error}
            </div>
            {error.includes('not registered') && (
              <div className="mt-3 space-y-2">
                <p className="text-red-300 text-sm mb-2">💡 Don't have an account?</p>
                <button onClick={() => onBack()} className="text-indigo-400 hover:text-indigo-300 underline text-sm">
                  📝 Sign up here
                </button>
              </div>
            )}
            {error.includes('not verified') && (
              <div className="mt-3 space-y-2">
                <p className="text-red-300 text-sm mb-2">💡 Your email is not verified. You need to:</p>
                <div className="space-y-2">
                  <button 
                    onClick={() => onBack()}
                    className="text-indigo-400 hover:text-indigo-300 underline text-sm"
                  >
                    📝 Sign up for a new account
                  </button>
                  <br />
                  <button 
                    onClick={() => window.location.href = 'mailto:infor@exametry.xyz'} 
                    className="text-indigo-400 hover:text-indigo-300 underline text-sm"
                  >
                    📞 Contact support for help
                  </button>
                </div>
              </div>
            )}
            {error.includes('not available') && (
              <div className="mt-3 space-y-2">
                <p className="text-red-300 text-sm mb-2">💡 Password reset is not available. You can:</p>
                <div className="space-y-2">
                  <button 
                    onClick={() => window.location.href = 'mailto:infor@exametry.xyz'} 
                    className="text-indigo-400 hover:text-indigo-300 underline text-sm"
                  >
                    📞 Contact support to reset your password
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Success Display */}
        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        {/* Step 1: Email Input */}
        {step === 'email' && (
          <form onSubmit={(e) => { e.preventDefault(); handleSendResetEmail(); }}>
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
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
            
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
                    {isLoading ? 'Sending...' : 'Send Reset Code'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Step 2: Code Verification */}
        {step === 'code' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <Mail className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Reset your password
                </h2>
                <p className="text-slate-600 dark:text-gray-400 mt-2">
                  Enter the code sent to your email
                </p>
              </div>
            </div>

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
        )}

        {/* Step 3: New Password */}
        {step === 'password' && (
          <form onSubmit={(e) => { e.preventDefault(); handlePasswordReset(); }}>
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
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>
            </div>
            
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
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </div>
            </div>
            
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
                    {isLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        <div className="form-links">
          <button
            onClick={onBack}
            disabled={isLoading}
          >
            Back to login
          </button>
        </div>

        <div className="credits">
          <button
            onClick={() => window.location.href = 'mailto:infor@exametry.xyz'}
          >
            Need help? Contact support
          </button>
        </div>
      </div>
    </div>
  );
}; 
import React, { useState, useRef, useEffect } from 'react';
import { Loader2, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';
import './cyberpunk-auth.css';

interface OTPVerificationProps {
  email: string;
  type: 'signup' | 'reset';
  onVerify: (otp: string) => Promise<void>;
  onBack: () => void;
}

export const OTPVerification: React.FC<OTPVerificationProps> = ({
  email,
  type,
  onVerify,
  onBack
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(60);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Focus first input on mount
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }

    // Start resend timer
    startResendTimer();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startResendTimer = () => {
    setResendTimer(60);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendOTP = async () => {
    try {
      setIsResending(true);
      setError(null);

      if (type === 'signup') {
        await signUpWithEmail(email, ''); // Password will be set after verification
      } else {
        await resetPassword(email);
      }

      startResendTimer();
    } catch (err) {
      setError('Failed to resend code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit
    if (!/^\d*$/.test(value)) return; // Only allow numbers

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input if value is entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Move to previous input on backspace if current input is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const otpString = otp.join('');
      if (otpString.length !== 6) {
        throw new Error('Please enter all digits');
      }
      await onVerify(otpString);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
      setOtp(['', '', '', '', '', '']); // Clear OTP on error
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="cyberpunk-auth">
      <div className="form">
      <div>
        <button
          onClick={onBack}
            className="form-links"
        >
            ← Back
        </button>
          <h1>Enter Verification Code</h1>
          <p style={{ textAlign: 'center', marginBottom: '20px', color: '#ccc' }}>
          We sent a verification code to {email}. Please enter it below.
        </p>
      </div>

        <form onSubmit={handleSubmit}>
          <div className="control" style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          {otp.map((digit, index) => (
                <div key={index} className="block-cube block-input" style={{ width: '40px', height: '50px' }}>
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
              ref={el => inputRefs.current[index] = el}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={1}
              value={digit}
              onChange={e => handleChange(index, e.target.value)}
              onKeyDown={e => handleKeyDown(index, e)}
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        textAlign: 'center', 
                        fontSize: '18px',
                        fontWeight: 'bold'
                      }}
              autoComplete="one-time-code"
            />
                  </div>
                </div>
          ))}
        </div>
          </div>

        {error && (
            <div className="error-message">
              {error}
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
            disabled={isLoading || otp.some(d => !d)}
                  className="btn"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </button>
              </div>
            </div>
          </div>

          <div className="form-links">
            <button
              type="button"
              onClick={handleResendOTP}
              disabled={resendTimer > 0 || isResending}
            >
              {isResending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Resending...
                </>
              ) : (
                <>
                  <RefreshCw size={14} />
                  {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend code'}
                </>
              )}
            </button>
          </div>
        </form>
        </div>
    </div>
  );
};
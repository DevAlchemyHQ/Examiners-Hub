import React, { useState, useRef, useEffect } from 'react';
import { Clipboard, Check, AlertCircle, Loader2 } from 'lucide-react';
import './cyberpunk-auth.css';

interface VerificationCodeInputProps {
  onCodeSubmit: (code: string) => void;
  onResendCode: () => void;
  isLoading?: boolean;
  error?: string;
  success?: string;
  codeLength?: number;
  autoFocus?: boolean;
}

export const VerificationCodeInput: React.FC<VerificationCodeInputProps> = ({
  onCodeSubmit,
  onResendCode,
  isLoading = false,
  error,
  success,
  codeLength = 6,
  autoFocus = true
}) => {
  const [code, setCode] = useState<string[]>(new Array(codeLength).fill(''));
  const [isPasting, setIsPasting] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Auto-submit when code is complete
  useEffect(() => {
    if (code.every(digit => digit !== '') && !isLoading) {
      const fullCode = code.join('');
      onCodeSubmit(fullCode);
    }
  }, [code, onCodeSubmit, isLoading]);

  // Handle resend countdown
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const handleInputChange = (index: number, value: string) => {
    if (value.length > 1) return; // Prevent multiple characters

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-advance to next input
    if (value !== '' && index < codeLength - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && code[index] === '' && index > 0) {
      const newCode = [...code];
      newCode[index - 1] = '';
      setCode(newCode);
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = async () => {
    try {
      setIsPasting(true);
      
      // Try to get clipboard data without permission popup
      let clipboardText = '';
      
      try {
        // First try to get clipboard data directly
        clipboardText = await navigator.clipboard.readText();
      } catch (clipboardError) {
        // If that fails, try using a temporary textarea
        const textarea = document.createElement('textarea');
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        document.execCommand('paste');
        clipboardText = textarea.value;
        document.body.removeChild(textarea);
      }
      
      const cleanCode = clipboardText.replace(/\D/g, '').slice(0, codeLength);
      
      if (cleanCode.length === codeLength) {
        const newCode = cleanCode.split('');
        setCode(newCode);
        
        // Focus the last input
        inputRefs.current[codeLength - 1]?.focus();
      }
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    } finally {
      setIsPasting(false);
    }
  };

  const handlePasteEvent = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const cleanCode = pastedData.replace(/\D/g, '').slice(0, codeLength);
    
    if (cleanCode.length === codeLength) {
      const newCode = cleanCode.split('');
      setCode(newCode);
      
      // Focus the last input
      inputRefs.current[codeLength - 1]?.focus();
    }
  };

  const handleResendCode = () => {
    if (resendCountdown === 0) {
      onResendCode();
      setResendCountdown(60); // 60 second countdown
    }
  };

  const clearCode = () => {
    setCode(new Array(codeLength).fill(''));
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="space-y-3">
      {/* Code Input Boxes with Paste Button */}
      <div className="flex items-center justify-center gap-3">
        <div className="flex gap-2">
          {code.map((digit, index) => (
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
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  placeholder="•"
                  onChange={(e) => handleInputChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePasteEvent}
                  onFocus={(e) => e.target.select()}
                  disabled={isLoading}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    textAlign: 'center', 
                    fontSize: '18px',
                    fontWeight: 'bold',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'white'
                  }}
                  autoFocus={autoFocus && index === 0}
                  autoComplete="one-time-code"
                />
              </div>
            </div>
          ))}
        </div>
        
        {/* Paste Button */}
        <button
          type="button"
          onClick={handlePaste}
          disabled={isLoading}
          className="form-links"
          style={{ marginLeft: '10px' }}
        >
          <Clipboard size={16} style={{ marginRight: '5px' }} />
          {isPasting ? 'Pasted!' : 'Paste'}
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="error-message">
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="success-message">
          <span>{success}</span>
        </div>
      )}

      {/* Clear Code Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={clearCode}
          disabled={isLoading}
          className="form-links"
        >
          Clear code
        </button>
      </div>

      {/* Resend Code */}
      <div className="text-center">
        <p style={{ color: '#ccc', fontSize: '14px', marginBottom: '10px' }}>
          Didn't receive the code?
        </p>
        <button
          type="button"
          onClick={handleResendCode}
          disabled={resendCountdown > 0 || isLoading}
          className="form-links"
          style={{
            opacity: resendCountdown > 0 || isLoading ? 0.5 : 1,
            cursor: resendCountdown > 0 || isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {resendCountdown > 0 
            ? `Resend in ${resendCountdown}s` 
            : 'Resend code'
          }
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', color: '#ccc', fontSize: '14px' }}>
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
                <button className="btn" disabled>
                  <Loader2 size={18} className="animate-spin" style={{ marginRight: '8px' }} />
                  Verifying...
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 
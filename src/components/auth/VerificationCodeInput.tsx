import React, { useState, useRef, useEffect } from 'react';
import { Clipboard, Check, AlertCircle } from 'lucide-react';

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
      <div className="flex items-center justify-center gap-2">
        <div className="flex gap-1">
          {code.map((digit, index) => (
            <input
              key={index}
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
              className={`
                w-8 h-8 text-center text-lg font-bold border rounded
                focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500
                transition-all duration-200
                ${error 
                  ? 'border-red-500 bg-red-100 dark:bg-red-900/30 dark:border-red-400' 
                  : success 
                    ? 'border-green-500 bg-green-100 dark:bg-green-900/30 dark:border-green-400'
                    : 'border-indigo-500 dark:border-indigo-400 bg-gray-900 dark:bg-gray-800'
                }
                ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                text-white
                shadow-sm
                outline-none
                placeholder:text-gray-400
                caret-color: transparent
              `}
              autoFocus={autoFocus && index === 0}
              style={{
                color: 'white',
                textShadow: '0 0 4px rgba(255,255,255,0.8)',
                fontWeight: '600',
                borderColor: error ? undefined : success ? undefined : '#6366f1' // indigo-500
              }}
            />
          ))}
        </div>
        
        {/* Paste Button */}
        <button
          type="button"
          onClick={handlePaste}
          disabled={isLoading}
          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors ml-2"
        >
          <Clipboard size={14} />
          {isPasting ? 'Pasted!' : 'Paste'}
        </button>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="text-center text-amber-600 dark:text-amber-400 text-sm">
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="text-center text-green-600 dark:text-green-400 text-sm">
          <span>{success}</span>
        </div>
      )}

      {/* Clear Code Button */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={clearCode}
          disabled={isLoading}
          className="text-xs text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
        >
          Clear code
        </button>
      </div>

      {/* Resend Code */}
      <div className="text-center">
        <p className="text-xs text-slate-600 dark:text-gray-400 mb-1">
          Didn't receive the code?
        </p>
        <button
          type="button"
          onClick={handleResendCode}
          disabled={resendCountdown > 0 || isLoading}
          className={`
            text-xs font-medium transition-colors
            ${resendCountdown > 0 || isLoading
              ? 'text-slate-400 dark:text-gray-500 cursor-not-allowed'
              : 'text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300'
            }
          `}
        >
          {resendCountdown > 0 
            ? `Resend in ${resendCountdown}s` 
            : 'Resend code'
          }
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-gray-400">
          <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Verifying...</span>
        </div>
      )}
    </div>
  );
}; 
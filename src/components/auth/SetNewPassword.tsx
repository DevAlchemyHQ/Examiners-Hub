import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, Lock } from 'lucide-react';
import './cyberpunk-auth.css';

export const SetNewPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await updatePassword(password);
      // Redirect to login page
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="cyberpunk-auth">
      <div className="form">
        <h1>Set New Password</h1>

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
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
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
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={8}
            />
              </div>
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
            disabled={isLoading}
                  className="btn"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Updating password...
              </>
            ) : (
              'Update Password'
            )}
          </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
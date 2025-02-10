import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, AlertCircle, Lock } from 'lucide-react';
import { updatePassword } from '../../lib/supabase';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 p-6">
      <div className="bg-gray-800/90 p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-700 backdrop-blur-lg">
        <div className="flex justify-center mb-6">
          <span className="text-5xl">🔐</span>
        </div>
        
        <h1 className="text-2xl font-bold text-white text-center mb-6">
          Set New Password
        </h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white pr-10 transition-all focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-gray-400"
              placeholder="Enter new password"
              required
              minLength={8}
            />
            <Lock className="absolute right-3 top-3 text-gray-400" size={20} />
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border border-gray-600 rounded-lg bg-gray-700 text-white pr-10 transition-all focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-gray-400"
              placeholder="Confirm new password"
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

          {error && (
            <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-3 rounded-lg">
              <AlertCircle size={18} />
              <span className="text-sm">{error}</span>
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
                Updating password...
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
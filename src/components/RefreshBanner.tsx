import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Info } from 'lucide-react';

interface RefreshBannerProps {
  className?: string;
}

const RefreshBanner: React.FC<RefreshBannerProps> = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed this version banner
    const dismissedVersion = localStorage.getItem('dismissed-version-banner');
    const currentVersion = '1.1.0';
    
    if (dismissedVersion !== currentVersion) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    localStorage.setItem('dismissed-version-banner', '1.1.0');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg transform transition-transform duration-300 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3 flex-1">
            <Info className="h-5 w-5 text-blue-200 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                🎉 New Version 1.1.0 Available - Session Restoration & Enhanced Features!
              </p>
              <p className="text-xs text-blue-100 mt-1">
                Your work is now automatically saved and restored when you log back in. 
                Refresh to get the latest features including improved image management and bulk defect handling.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-1 px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-md transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              <span className="hidden sm:inline">Refresh Now</span>
              <span className="sm:hidden">Refresh</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefreshBanner; 
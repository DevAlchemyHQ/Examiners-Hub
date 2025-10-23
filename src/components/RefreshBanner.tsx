import React, { useState, useEffect } from 'react';
import { RefreshCw, Info } from 'lucide-react';

interface RefreshBannerProps {
  className?: string;
}

const RefreshBanner: React.FC<RefreshBannerProps> = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Banner has been seen and dismissed - don't show it again
    setIsVisible(false);
  }, []);

  const handleRefresh = () => {
    // Mark banner as dismissed and set version as seen
    localStorage.setItem('dismissed-version-banner', 'true');
    localStorage.setItem('last-seen-version', '1.1.1');
    
    // Force a hard refresh to ensure all new features load
    window.location.href = window.location.href;
  };
  
  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-lg ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Info className="h-5 w-5 text-green-200" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                🎉 Version 1.1.1 - Major Update Available!
              </p>
              <p className="text-xs text-green-100 mt-1">
                Download functionality fully restored and optimized. Session persistence improved. All features now working seamlessly across all browsers.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-1 px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-md transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Update Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefreshBanner; 
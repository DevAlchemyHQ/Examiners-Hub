import React, { useState, useEffect } from 'react';
import { RefreshCw, Info } from 'lucide-react';

interface RefreshBannerProps {
  className?: string;
}

const RefreshBanner: React.FC<RefreshBannerProps> = ({ className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Clear ALL previous banner states and show only the latest version
    const currentVersion = '1.1.1';
    const lastSeenVersion = localStorage.getItem('last-seen-version');
    
    // If this is a new version OR if no version has been seen, show the banner
    if (lastSeenVersion !== currentVersion) {
      // Clear any previous banner dismissal states
      localStorage.removeItem('dismissed-version-banner');
      localStorage.removeItem('dismissed-version-banner-1.1.0');
      localStorage.removeItem('dismissed-version-banner-1.0.1');
      localStorage.removeItem('dismissed-version-banner-1.0.0');
      
      // Set this as the last seen version
      localStorage.setItem('last-seen-version', currentVersion);
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    localStorage.setItem('dismissed-version-banner', '1.1.1');
  };

  const handleRefresh = () => {
    // Clear all banner states before refresh to ensure clean state
    localStorage.removeItem('dismissed-version-banner');
    localStorage.removeItem('dismissed-version-banner-1.1.0');
    localStorage.removeItem('dismissed-version-banner-1.0.1');
    localStorage.removeItem('dismissed-version-banner-1.0.0');
    localStorage.setItem('last-seen-version', '1.1.1');
    window.location.reload();
  };

  if (!isVisible || isDismissed) {
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
                🔧 Version 1.1.1 - Defect Set Loading Fixed!
              </p>
              <p className="text-xs text-green-100 mt-1">
                Fixed critical JavaScript error in defect set loading. Your saved defect sets now load properly with all photo numbers and descriptions restored.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              className="flex items-center space-x-1 px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-xs font-medium rounded-md transition-colors"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Refresh Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefreshBanner; 
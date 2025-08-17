import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Camera, User, CreditCard, Settings, LogOut, XCircle, Edit3, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { StorageService, DatabaseService, AuthService } from '../lib/services';
import { useMetadataStore } from '../store/metadataStore';
import { useThemeStore } from '../store/themeStore';

// Version check system
const CURRENT_VERSION = '1.1.1';

export const Header: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuthStore();
  const { setUser } = useAuthStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('/dashboard'); // Static active tab state
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Use ref to prevent re-renders
  const headerRef = useRef<HTMLDivElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const dateRef = useRef<HTMLSpanElement>(null);

  // Update active tab when location changes, but don't re-render header
  useEffect(() => {
    setActiveTab(location.pathname);
  }, [location.pathname]);

  // Update time every minute without re-rendering the component
  useEffect(() => {
    const updateTime = () => {
      if (timeRef.current) {
        timeRef.current.textContent = new Date().toLocaleTimeString('en-GB', { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: false 
        });
      }
    };

    // Update immediately
    updateTime();
    
    // Update every minute
    const interval = setInterval(updateTime, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Update date once per day without re-rendering the component
  useEffect(() => {
    const updateDate = () => {
      if (dateRef.current) {
        dateRef.current.textContent = new Date().toLocaleDateString('en-GB', { 
          day: 'numeric', 
          month: 'short' 
        });
      }
    };

    // Update immediately
    updateDate();
    
    // Update every day at midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const interval = setInterval(updateDate, 24 * 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Dynamic greeting based on time of day
  const getGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  // Get user's display name
  const getUserDisplayName = useCallback(() => {
    return user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  }, [user?.user_metadata?.full_name, user?.email]);

  const navigationTabs = useMemo(() => [
    { path: '/dashboard', label: 'Images' },
    { path: '/calculator', label: 'Calc' },
    { path: '/grid', label: 'Grid' },
    { path: '/faq', label: 'FAQ' },
  ], []);

  const profileImage = useMemo(() => {
    const avatarUrl = user?.user_metadata?.avatar_url;
    console.log('🔍 Profile image debug:', {
      hasUser: !!user,
      hasUserMetadata: !!user?.user_metadata,
      avatarUrl,
      fullUserMetadata: user?.user_metadata
    });
    
    // If we have a valid avatar URL, use it
    if (avatarUrl && avatarUrl !== '' && avatarUrl !== '🚂') {
      return avatarUrl;
    }
    
    // Fallback to emoji or default
    return user?.user_metadata?.avatar_emoji || '🚂';
  }, [user?.user_metadata?.avatar_url, user?.user_metadata?.avatar_emoji]);
  const subscriptionPlan = useMemo(() => user?.user_metadata.subscription_plan, [user?.user_metadata.subscription_plan]);
  const subscriptionStatus = useMemo(() => user?.user_metadata.subscription_status || 'active', [user?.user_metadata.subscription_status]);
  const subscriptionEndDate = useMemo(() => user?.user_metadata.subscription_end_date || '', [user?.user_metadata.subscription_end_date]);

  const isSubscriptionEndDateFuture = useMemo(() => subscriptionEndDate
    ? new Date(subscriptionEndDate) > new Date()
    : false, [subscriptionEndDate]);

  const formattedSubscriptionEndDate = useMemo(() => {
    if (!subscriptionEndDate) return '';
    return new Date(subscriptionEndDate).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }, [subscriptionEndDate]);

  const getTimeRemaining = useCallback(() => {
    if (!subscriptionEndDate || !isSubscriptionEndDateFuture) return null;
    
    const now = new Date();
    const endDate = new Date(subscriptionEndDate);
    const diff = endDate.getTime() - now.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''}${hours > 0 ? `, ${hours} hour${hours !== 1 ? 's' : ''}` : ''}`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      return 'Less than 1 hour';
    }
  }, [subscriptionEndDate, isSubscriptionEndDateFuture]);

  const timeRemaining = useMemo(() => getTimeRemaining(), [getTimeRemaining]);

  const fetchSubscriptionDetails = async () => {
    if (!user?.email) return;
    
    try {
      const result = await DatabaseService.getSubscriptionDetails(user.email);
      if (result.error) {
        console.error('Error fetching subscription details:', result.error);
        return;
      }
      
      if (result.data) {
        setUser({
          ...user,
          user_metadata: {
            ...user.user_metadata,
            subscription_plan: result.data.plan || 'Basic',
            subscription_status: result.data.status || 'active',
            subscription_end_date: result.data.end_date || ''
          }
        });
      }
    } catch (error) {
      console.error('Error fetching subscription details:', error);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateImageFile = (file: File): { valid: boolean; error?: string } => {
    const maxSize = 10 * 1024 * 1024; // 10MB for profile images
    
    if (file.size > maxSize) {
      return { 
        valid: false, 
        error: `${file.name} (${formatFileSize(file.size)} - too large). Max size is 10MB for profile images.` 
      };
    }
    
    return { valid: true };
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file size
    const validation = validateImageFile(file);
    if (!validation.valid) {
      alert(validation.error || 'File validation failed');
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    try {
      // Upload to S3 using StorageService
      const uploadResult = await StorageService.uploadFile(file, filePath);

      if (uploadResult.error) {
        console.error('Upload error:', uploadResult.error);
        throw uploadResult.error;
      }

      // Update user profile in database
      await DatabaseService.updateProfile(user.id, { avatar_url: uploadResult.url });

      // Update local state
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          avatar_url: uploadResult.url,
        }
      });
    } catch (error) {
      console.error('Image upload error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🔄 Starting logout process...');
      setIsLoggingOut(true);
      
      // Don't close the menu immediately, let the user see the loading state
      console.log('🚪 Calling logout function...');
      await logout();
      
      console.log('✅ Logout successful, navigating to login...');
      setShowProfileMenu(false);
      navigate('/');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Even if logout fails, try to navigate away
      setShowProfileMenu(false);
      navigate('/');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleUnsubscribe = () => {
    setShowUnsubscribeModal(true);
  };

  const confirmUnsubscribe = async () => {
    if (!user?.email) return;
    
    try {
      const result = await DatabaseService.cancelSubscription(user.email);
      if (result.error) {
        console.error('Error cancelling subscription:', result.error);
        return;
      }
      
      // Update local state
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          subscription_status: 'cancelled'
        }
      });
      
      setShowUnsubscribeModal(false);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    }
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showProfileMenu && 
          !target.closest('.profile-button') && 
          !target.closest('.profile-menu')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showProfileMenu]);

  const handleNavigation = useCallback((path: string) => {
    navigate(path);
    setActiveTab(path);
  }, [navigate]);

  // Test cross-browser persistence functionality
  const testCrossBrowserPersistence = async () => {
    try {
      console.log('🧪 Testing cross-browser persistence...');
      
      const { smartAutoSave, loadAllUserDataFromAWS } = useMetadataStore.getState();
      
      // Test saving all data to AWS
      console.log('💾 Testing AWS save...');
      await smartAutoSave('all');
      console.log('✅ AWS save test completed');
      
      // Test loading data from AWS
      console.log('📥 Testing AWS load...');
      await loadAllUserDataFromAWS();
      console.log('✅ AWS load test completed');
      
      console.log('🎉 Cross-browser persistence test completed successfully!');
      
      // Show success message to user
      if (typeof window !== 'undefined' && window.toast) {
        window.toast.success('Cross-browser persistence test completed successfully!');
      }
      
    } catch (error) {
      console.error('❌ Cross-browser persistence test failed:', error);
      
      // Show error message to user
      if (typeof window !== 'undefined' && window.toast) {
        window.toast.error('Cross-browser persistence test failed. Check console for details.');
      }
    }
  };

  // Refresh profile data to fix avatar display issues
  const refreshProfileData = async () => {
    try {
      console.log('🔄 Refreshing profile data...');
      
      if (!user?.id || !user?.email) {
        console.error('❌ No user ID or email available');
        return;
      }
      
      const { ProfileService } = await import('../lib/services');
      const profileResult = await ProfileService.getOrCreateUserProfile(user.id, user.email);
      
      if (profileResult) {
        console.log('✅ Profile data refreshed:', profileResult);
        
        // Update user with fresh profile data
        const updatedUser = {
          ...user,
          user_metadata: {
            ...user.user_metadata,
            avatar_url: profileResult.avatar_url,
            avatar_emoji: profileResult.avatar_emoji,
            full_name: profileResult.full_name || user.user_metadata?.full_name
          }
        };
        
        // Update the user in the store
        const { setUser } = useAuthStore.getState();
        setUser(updatedUser);
        
        console.log('✅ User updated with fresh profile data');
        alert('✅ Profile data refreshed! Check if your avatar is now visible.');
      } else {
        console.error('❌ Failed to refresh profile data');
        alert('❌ Failed to refresh profile data. Check console for details.');
      }
      
    } catch (error) {
      console.error('❌ Error refreshing profile data:', error);
      alert('❌ Error refreshing profile data. Check console for details.');
    }
  };

  return (
    <>
      <header className="bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="w-full px-4">
          <div className="h-16 flex items-center justify-between">
            {/* Left Section - Logo and Greeting */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <Menu size={20} />
              </button>
              
              <div className="flex items-center gap-3">
                <img 
                  src="/feather-logo.svg" 
                  alt="Exametry" 
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg shadow-sm cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate('/')}
                  style={{
                    filter: 'brightness(0) invert(1)',
                    opacity: 0.9
                  }}
                />
                <div className="flex items-center gap-2 sm:gap-3 pointer-events-none">
                  <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white select-none">
                    {getGreeting()}, 
                    <span className="inline-flex items-center gap-1 ml-1 select-none">
                      <span className="hidden sm:inline">{getUserDisplayName()}</span>
                      <span className="sm:hidden">{getUserDisplayName().split(' ')[0]}</span>
                    </span>! 😊
                  </h1>
                  
                  {/* Show subscription end date info for cancelled but active subscriptions */}
                  {subscriptionStatus === 'cancelled' && isSubscriptionEndDateFuture && subscriptionPlan !== 'Basic' && (
                    <div className="hidden md:flex items-center px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                      <span className="text-xs text-amber-700 dark:text-amber-400">
                        <span className="font-medium">{subscriptionPlan}</span> until {formattedSubscriptionEndDate}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Center Section - Navigation */}
            <nav className="hidden lg:flex items-center justify-center flex-1 px-8">
              <div className="flex items-center space-x-8 w-full">
                {navigationTabs.map((tab) => (
                  <button
                    key={tab.path}
                    onClick={() => handleNavigation(tab.path)}
                    className={`
                      px-8 py-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 text-center
                      ${activeTab === tab.path
                        ? 'bg-indigo-500 text-white shadow-md'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-white'
                      }
                    `}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </nav>

            {/* Right Section - Date, Time, and Profile */}
            <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
              {/* Time and Date Display */}
              <div className="hidden sm:flex items-center gap-3 lg:gap-4 text-sm text-slate-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{new Date().toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                  <span ref={dateRef} className="text-slate-500 dark:text-gray-400">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </div>
                
                <div className="w-px h-4 bg-slate-200 dark:bg-gray-700" />
                
                <div className="flex items-center gap-2">
                  <span ref={timeRef} className="font-medium">{new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                  <span className="text-xs text-slate-500 dark:text-gray-400">UK</span>
                </div>
              </div>
              
              {/* Profile Button */}
              <div className="relative flex items-center gap-2">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="profile-button w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center text-lg hover:bg-indigo-600 transition-all duration-200 overflow-hidden shadow-md"
                >
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <User size={20} />
                  )}
                </button>
                <span className="text-xs text-gray-600 dark:text-gray-300 font-mono font-medium">v1.1.1</span>
                
                {/* Profile Menu */}
                {showProfileMenu && (
                  <div className="profile-menu absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-[9999]">
                    {/* Header with Profile Picture */}
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-4">
                        <div className="relative group">
                          <div className="w-16 h-16 rounded-full bg-indigo-500 flex items-center justify-center cursor-pointer overflow-hidden ring-2 ring-gray-200 dark:ring-gray-600">
                            {profileImage ? (
                              <img
                                src={profileImage}
                                alt="Profile"
                                className="w-full h-full object-cover rounded-full"
                              />
                            ) : (
                              <User size={28} className="text-white" />
                            )}
                          </div>
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-full flex items-center justify-center">
                            <Camera size={20} className="text-white" />
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {getUserDisplayName()}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Subscription Status */}
                    <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-700 dark:to-gray-600">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Plan</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                            {subscriptionPlan || 'Basic'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            subscriptionStatus === 'active' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200'
                          }`}>
                            {subscriptionStatus === 'active' ? 'Active' : 'Cancelled'}
                          </span>
                        </div>
                      </div>
                      {subscriptionEndDate && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Expires {formattedSubscriptionEndDate}
                        </p>
                      )}
                    </div>

                    {/* Name Editor */}
                    <div className="p-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={user?.user_metadata?.full_name || ''}
                        onChange={async (e) => {
                          const newName = e.target.value;
                          if (user) {
                            setUser({
                              ...user,
                              user_metadata: {
                                ...user.user_metadata,
                                full_name: newName
                              }
                            });
                            
                            // Auto-save after a short delay
                            setTimeout(async () => {
                              try {
                                if (user?.email && newName.trim()) {
                                  const result = await AuthService.updateUserAttributes(user.email, { name: newName });
                                  if (result.success) {
                                    console.log('✅ Profile name auto-saved successfully');
                                  } else {
                                    console.error('❌ Failed to auto-save profile name:', result.error);
                                  }
                                }
                              } catch (error) {
                                console.error('❌ Error auto-saving profile name:', error);
                              }
                            }, 1000);
                          }
                        }}
                        className="w-full px-4 py-3 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                        placeholder="Enter your display name"
                      />
                    </div>

                    {/* Cross-Browser Persistence Test */}
                    <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
                      <button
                        onClick={async () => {
                          try {
                            console.log('🧪 Testing cross-browser persistence...');
                            
                            const { smartAutoSave, loadAllUserDataFromAWS } = await import('../store/metadataStore');
                            const metadataStore = useMetadataStore.getState();
                            
                            // Test saving all data to AWS
                            console.log('💾 Testing AWS save...');
                            await metadataStore.smartAutoSave('all');
                            console.log('✅ AWS save test completed');
                            
                            // Test loading data from AWS
                            console.log('📥 Testing AWS load...');
                            await metadataStore.loadAllUserDataFromAWS();
                            console.log('✅ AWS load test completed');
                            
                            console.log('🎉 Cross-browser persistence test completed successfully!');
                            
                            // Show success message
                            alert('✅ Cross-browser persistence test completed successfully! Check console for details.');
                            
                          } catch (error) {
                            console.error('❌ Cross-browser persistence test failed:', error);
                            alert('❌ Cross-browser persistence test failed. Check console for details.');
                          }
                        }}
                        className="w-full px-4 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 flex items-center justify-center gap-2 transition-colors"
                      >
                        🧪 Test Cross-Browser Persistence
                      </button>
                    </div>

                    {/* Refresh Profile Data */}
                    <div className="px-6 py-2">
                      <button
                        onClick={refreshProfileData}
                        className="w-full px-4 py-3 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 flex items-center justify-center gap-2 transition-colors"
                      >
                        🔄 Refresh Profile Data
                      </button>
                    </div>

                    {/* Sign Out */}
                    <div className="px-6 pb-6">
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isLoggingOut ? (
                          <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <LogOut size={16} />
                        )}
                        {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden py-4 space-y-2">
          {navigationTabs.map((tab) => (
            <button
              key={tab.path}
              onClick={() => handleNavigation(tab.path)}
              className={`
                w-full px-6 py-4 text-left text-base font-medium transition-all duration-200 rounded-lg
                ${activeTab === tab.path
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {showUnsubscribeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <XCircle className="text-red-500" size={24} />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                Confirm Unsubscribe
              </h3>
            </div>
            <p className="text-slate-600 dark:text-gray-300 mb-3">
              Are you sure you want to unsubscribe from {subscriptionPlan}?
            </p>
            
            {/* Display subscription end date and time remaining */}
            {isSubscriptionEndDateFuture && (
              <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                  If you unsubscribe, your {subscriptionPlan} plan will remain active until:
                </p>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {formattedSubscriptionEndDate}
                </p>
                {timeRemaining && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Time remaining: {timeRemaining}
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowUnsubscribeModal(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmUnsubscribe}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Yes, Unsubscribe
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}); 
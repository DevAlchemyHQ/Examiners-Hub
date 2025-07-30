import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Camera, User, CreditCard, Settings, LogOut, XCircle, Edit3 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { StorageService, DatabaseService, AuthService } from '../lib/services';
import { EditProfileModal } from './profile/EditProfile';

export const Header: React.FC = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuthStore();
  const { setUser } = useAuthStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('/dashboard'); // Static active tab state

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

  const profileImage = useMemo(() => user?.user_metadata.avatar_url || '🚂', [user?.user_metadata.avatar_url]);
  const subscriptionPlan = useMemo(() => user?.user_metadata.subscription_plan, [user?.user_metadata.subscription_plan]);
  const subscriptionStatus = useMemo(() => user?.user_metadata.subscription_status || 'active', [user?.user_metadata.subscription_status]);
  const subscriptionEndDate = useMemo(() => user?.user_metadata.subscription_end_date || '', [user?.user_metadata.subscription_end_date]);

  // Check if subscription end date is in the future
  const isSubscriptionEndDateFuture = useMemo(() => subscriptionEndDate 
    ? new Date(subscriptionEndDate) > new Date() 
    : false, [subscriptionEndDate]);

  // Calculate time remaining until subscription ends
  const getTimeRemaining = useCallback(() => {
    if (!subscriptionEndDate) return null;
    
    const endDate = new Date(subscriptionEndDate);
    const now = new Date();
    
    if (endDate <= now) return null;
    
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays > 30) {
      const diffMonths = Math.floor(diffDays / 30);
      return `${diffMonths} month${diffMonths > 1 ? 's' : ''}`;
    } else {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
    }
  }, [subscriptionEndDate]);

  const timeRemaining = useMemo(() => getTimeRemaining(), [getTimeRemaining]);

  const fetchSubscriptionDetails = async () => {
    if (!user?.email) return;
  
    try {
      console.log('Fetching subscription details from AWS DynamoDB');
      
      // Get user profile from DynamoDB
      const { profile, error } = await DatabaseService.getProfile(user.id);
      
      if (error) {
        console.error("Error fetching subscription details:", error);
        // Use default subscription data
        setUser({
          ...user,
          user_metadata: {
            ...user.user_metadata,
            subscription_plan: 'Basic',
            subscription_status: 'active',
            subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        });
        return;
      }
      
      if (profile) {
        setUser({
          ...user,
          user_metadata: {
            ...user.user_metadata,
            subscription_plan: profile.subscription_plan || 'Basic',
            subscription_status: profile.subscription_status || 'active',
            subscription_end_date: profile.subscription_end_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        });
      }
    } catch (err) {
      console.error("Unexpected error fetching subscription details:", err);
      // Use default subscription data on error
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          subscription_plan: 'Basic',
          subscription_status: 'active',
          subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });
    }
  };

  const formattedSubscriptionEndDate = subscriptionEndDate
  ? new Date(subscriptionEndDate).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  : '';

  const handleNavigation = useCallback((path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  }, [navigate]);

  const handleSubsciption = useCallback(() => {
    navigate('/subscriptions');
    setShowProfileMenu(false);
  }, [navigate]);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file || !user) return;

      // Generate file path with user's id as folder name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `avatars/${user.id}/${fileName}`;

      // Upload to S3 using StorageService
      const uploadResult = await StorageService.uploadFile(file, filePath);
      
      if (uploadResult.error) {
        console.error('Upload error:', uploadResult.error);
        throw uploadResult.error;
      }

      // Update user profile with new avatar URL using AWS
      await DatabaseService.updateProfile(user.id, { avatar_url: uploadResult.url });
      setUser({
        ...user,
        user_metadata: {
          ...user.user_metadata,
          avatar_url: uploadResult.url,
        },
      });
    } catch (error) {
      console.error('Image upload error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      setShowProfileMenu(false);
      await AuthService.signOut();
      await logout();
      navigate("/login");
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleUnsubscribe = () => {
    setShowProfileMenu(false);
    setShowUnsubscribeModal(true);
  };

  const confirmUnsubscribe = async () => {
    try {
      if (user) {
        // await cancelSubscription(user.id); // This line was removed as per the edit hint
        setUser({
          ...user,
          user_metadata: {
            ...user.user_metadata,
            subscription_plan: 'Basic',
            subscription_status: 'cancelled',
            cancelled_date: new Date().toISOString(),
          },
        });
      }
      setShowUnsubscribeModal(false);
    } catch (error) {
      console.error('Unsubscribe error:', error);
    }
  };

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.profile-menu') && !target.closest('.profile-button')) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    fetchSubscriptionDetails();
  }, [user?.email]);
  

  const headerContent = useMemo(() => (
    <div className="max-w-7xl mx-auto px-4">
      <div className="h-16 flex items-center justify-between">
        {/* Left Section - Logo and Greeting */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <Menu size={20} />
          </button>
          
          <div 
            onClick={() => navigate('/')}
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
          >
            <img 
              src="/feather-logo.svg" 
              alt="Exametry" 
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg shadow-sm"
              style={{
                filter: 'brightness(0) invert(1)',
                opacity: 0.9
              }}
            />
            <div className="flex items-center gap-2 sm:gap-3">
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-white">
                {getGreeting()}, 
                <button 
                  onClick={() => setShowEditProfile(true)}
                  className="inline-flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ml-1"
                  title="Click to edit your name"
                >
                  <span className="hidden sm:inline">{getUserDisplayName()}</span>
                  <span className="sm:hidden">{getUserDisplayName().split(' ')[0]}</span>
                  <Edit3 size={14} className="opacity-60 hover:opacity-100" />
                </button>! 😊
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
          <div className="flex items-center space-x-8">
            {navigationTabs.map((tab) => (
              <button
                key={tab.path}
                onClick={() => handleNavigation(tab.path)}
                className={`
                  px-6 py-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 shrink-0 min-w-[100px] text-center
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
          <div className="relative">
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
                profileImage
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  ), [
    // Only include static dependencies that don't change on navigation
    isMobileMenuOpen,
    navigate,
    getGreeting,
    getUserDisplayName,
    setShowEditProfile,
    subscriptionStatus,
    isSubscriptionEndDateFuture,
    subscriptionPlan,
    formattedSubscriptionEndDate,
    navigationTabs,
    handleNavigation,
    activeTab,
    profileImage,
  ]);

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm" key="header" ref={headerRef}>
      {headerContent}

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

      {/* Profile Menu */}
      {showProfileMenu && (
        <div className="profile-menu absolute right-0 mt-2 w-72 bg-gray-800/90 rounded-lg shadow-xl border border-gray-700 backdrop-blur-lg z-50">
          {/* User Info Section */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-indigo-500 flex items-center justify-center text-xl">
                  {profileImage}
                </div>
              )}
              
              {/* Hidden File Input */}
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                id="profile-upload" 
                onChange={handleImageUpload} 
              />
              
              {/* Camera Button */}
              <button 
                className="absolute -bottom-1 -right-1 p-1 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors"
                onClick={() => document.getElementById('profile-upload')?.click()}
              >
                <Camera size={12} className="text-gray-300" />
              </button>
            </div>
              <div>
                <h3 className="text-white font-medium">{user?.user_metadata.full_name || 'User'}</h3>
                <p className="text-sm text-gray-400">{user?.email || 'No email available'}</p>
              </div>
            </div>
          </div>

          {/* Subscription Info */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Current Plan</span>
              <span className={`text-xs px-2 py-1 rounded-full ${subscriptionPlan === 'Basic' ? 'bg-green-500' : 'bg-indigo-500'} text-white`}>
                {subscriptionPlan}
              </span>
            </div>
            {subscriptionPlan === 'Basic' ? (
              subscriptionStatus === 'cancelled' && isSubscriptionEndDateFuture ? (
                <div className="text-xs text-gray-500">
                  Access until: {formattedSubscriptionEndDate}
                </div>
              ) : (
                <div className="text-xs text-gray-500">Free Plan</div>
              )
            ) : (
              <div className="text-xs text-gray-500">
                {subscriptionStatus === 'active' ? (
                  subscriptionEndDate ? `Next billing date: ${formattedSubscriptionEndDate}` : 'Active'
                ) : (
                  subscriptionStatus === 'cancelled' && isSubscriptionEndDateFuture ? 
                  `Access until: ${formattedSubscriptionEndDate}` : 'Inactive'
                )}
              </div>
            )}
            {subscriptionPlan !== 'Basic' && subscriptionStatus === 'active' && (
              <button
                onClick={handleUnsubscribe}
                className="w-full text-sm text-red-400 hover:bg-red-900/20 rounded-lg py-2 mt-2"
              >
                Unsubscribe
              </button>
            )}
          </div>

          {/* Menu Items */}
          <div className="p-2">
            <button 
              onClick={() => setShowEditProfile(true)}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 rounded-lg flex items-center gap-2">
              <User size={16} />
              Edit Profile
            </button>
            <button 
              onClick={handleSubsciption}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 rounded-lg flex items-center gap-2">
              <CreditCard size={16} />
              Manage Subscription
            </button>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 rounded-lg flex items-center gap-2"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      )}

      {showEditProfile && <EditProfileModal isOpen={showEditProfile} onClose={() => setShowEditProfile(false)} />}

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
    </header>
  );
});
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Sun, Moon, Info, User, Camera, Settings, XCircle, CreditCard, Menu } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useThemeStore } from '../store/themeStore';
import { WeatherDate } from './WeatherDate';
import { EditProfileModal } from './profile/EditProfile';
import { signOut, updateUserProfile } from '../lib/supabase';

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, user } = useAuthStore();
  console.log("user------------------", user);
  const { setUser } = useAuthStore();
  const { isDark, toggle } = useThemeStore();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showBetaInfo, setShowBetaInfo] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showUnsubscribeModal, setShowUnsubscribeModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigationTabs = [
    { path: '/projects', label: 'Projects' },
    { path: '/dashboard', label: 'Images' },
    { path: '/pdf', label: 'PDF' },
    { path: '/calculator', label: 'Calc' },
    { path: '/grid', label: 'Grid' },
    { path: '/bscm-ai', label: 'BSCM & AI' },
    { path: '/games', label: 'Games' },
    { path: '/subscriptions', label: 'Subscription' },
  ];

  const profileImage = user?.user_metadata.avatar_url || '🚂';
  const subscriptionPlan = user?.user_metadata.subscription_plan;
  const subscriptionStatus = user?.user_metadata.subscription_status || 'active';
  const subscriptionEndDate = user?.user_metadata.subscription_end_date || '';


  const handleNavigation = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleSubsciption = () => {
    navigate('/subscriptions');
    setShowProfileMenu(false);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
  
    try {
      // Generate file path with user's id as folder name
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;
  
      const { data: existingFiles } = await supabase.storage
        .from('avatars')
        .list(user.id);
      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage
          .from('avatars')
          .remove(existingFiles.map(f => `${user.id}/${f.name}`));
      }
  
      // Upload file to the 'avatars' bucket
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });
  
      if (uploadError) throw uploadError;
  
      // Get the public URL for the uploaded file
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(uploadData.path);
  
      if (publicUrlData) {
        await updateUserProfile(user.id, { avatar_url: publicUrlData.publicUrl });
        setUser({
          ...user,
          user_metadata: {
            ...user.user_metadata,
            avatar_url: publicUrlData.publicUrl,
          },
        });
      }
    } catch (error) {
      console.error('Image upload error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      setShowProfileMenu(false);
      await signOut();
      await logout();
      navigate("/");
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
        await updateUserProfile(user.id, { subscription_status: 'Basic' });
        setUser({
          ...user,
          user_metadata: {
            ...user.user_metadata,
            subscription_plan: 'Basic',
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

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <h1 
              onClick={() => navigate('/projects')}
              className="text-xl font-bold text-slate-800 dark:text-white cursor-pointer shrink-0">
              Welcome to Exametry 🙂
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1 overflow-x-auto">
            {navigationTabs.map((tab) => (
              <button
                key={tab.path}
                onClick={() => handleNavigation(tab.path)}
                className={`
                  px-3 py-1.5 whitespace-nowrap rounded-lg text-sm font-medium transition-colors shrink-0
                  ${location.pathname === tab.path
                    ? 'bg-indigo-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:block">
              <WeatherDate />
            </div>
            
            <button
              onClick={toggle}
              className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="profile-button w-8 h-8 rounded-full bg-indigo-500 text-white flex items-center justify-center text-lg hover:bg-indigo-600 transition overflow-hidden"
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
                        <div className="text-xs text-gray-500">Free Plan</div>
                      ) : (
                        <div className="text-xs text-gray-500">
                          {subscriptionStatus === 'active' ? (
                            subscriptionEndDate ? `Next billing date: ${subscriptionEndDate.toLocaleDateString()}` : 'Active'
                          ) : 'Inactive'}
                        </div>
                      )}
                      {subscriptionPlan !== 'Basic' && (
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
                    {/* <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700/50 rounded-lg flex items-center gap-2">
                      <Settings size={16} />
                      Settings
                    </button> */}
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
            </div>

            <button
              onClick={() => setShowBetaInfo(true)}
              className="hidden sm:flex text-xs font-medium px-2 py-1 bg-indigo-900/50 text-indigo-400 rounded-full hover:bg-indigo-900/70 transition-colors items-center gap-1 shrink-0"
            >
              <Info size={12} />
              BETA
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-4 space-y-1">
            {navigationTabs.map((tab) => (
              <button
                key={tab.path}
                onClick={() => handleNavigation(tab.path)}
                className={`
                  w-full px-4 py-2 text-left text-sm font-medium transition-colors
                  ${location.pathname === tab.path
                    ? 'bg-indigo-500 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                  rounded-lg
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showBetaInfo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                Beta Version
              </h3>
            </div>
            <p className="text-slate-600 dark:text-gray-300 mb-6">
              Some features may be incomplete or have occasional glitches. We value your
              feedback and patience!
            </p>
            <button
              onClick={() => setShowBetaInfo(false)}
              className="w-full px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
            >
              Got it
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
            <p className="text-slate-600 dark:text-gray-300 mb-6">
              Are you sure you want to unsubscribe from {subscriptionPlan}?
            </p>
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
};
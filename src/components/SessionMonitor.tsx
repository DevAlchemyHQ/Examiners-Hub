import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const SessionMonitor: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, validateSession, logout } = useAuthStore();
  const sessionCheckInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only monitor sessions if user is authenticated
    if (!isAuthenticated) {
      return;
    }

    // Validate session every 5 minutes
    const validateSessionPeriodically = async () => {
      try {
        const isValid = await validateSession();
        if (!isValid) {
          console.log('❌ Session expired, redirecting to login');
          navigate('/login');
        }
      } catch (error) {
        console.error('Session validation error:', error);
        await logout();
        navigate('/login');
      }
    };

    // Initial validation
    validateSessionPeriodically();

    // Set up periodic validation
    sessionCheckInterval.current = setInterval(validateSessionPeriodically, 5 * 60 * 1000); // 5 minutes

    // Cleanup on unmount
    return () => {
      if (sessionCheckInterval.current) {
        clearInterval(sessionCheckInterval.current);
      }
    };
  }, [isAuthenticated, validateSession, logout, navigate]);

  // Monitor for user inactivity (30 minutes)
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    let inactivityTimer: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(async () => {
        console.log('❌ User inactive for 30 minutes, logging out');
        await logout();
        navigate('/login');
      }, 30 * 60 * 1000); // 30 minutes
    };

    // Reset timer on user activity
    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    // Set up activity listeners
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true);
    });

    // Start the inactivity timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true);
      });
    };
  }, [isAuthenticated, logout, navigate]);

  // This component doesn't render anything
  return null;
}; 
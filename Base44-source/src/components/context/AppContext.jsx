import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUserWithDefaults, getGlobalEconomySettings } from '../user/UserService';
import { createPageUrl } from '@/utils';

const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [economySettings, setEconomySettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [user, economy] = await Promise.all([
        getCurrentUserWithDefaults(),
        getGlobalEconomySettings()
      ]);
      
      setCurrentUser(user);
      setEconomySettings(economy);
    } catch (error) {
      console.error('Error loading app data:', error);
      setError(error);
      // If user is not authenticated, redirect to Welcome page
      if (window.location.pathname !== createPageUrl('Welcome')) {
        window.location.href = createPageUrl('Welcome');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateUserData = (updates) => {
    setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
  };

  const refreshUserData = async () => {
    await loadUserData();
  };

  useEffect(() => {
    // Only load data if we're not on the Welcome page
    const currentPath = window.location.pathname;
    if (!currentPath.includes('Welcome')) {
      loadUserData();
    } else {
      setLoading(false);
    }
  }, []);

  const value = {
    currentUser,
    economySettings,
    loading,
    error,
    updateUserData,
    refreshUserData,
    setCurrentUser,
    setEconomySettings
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};
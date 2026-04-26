'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type ExportFormat = 'pdf' | 'excel' | 'csv';
export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';

interface NotificationSettings {
  email: boolean;
  browser: boolean;
}

interface ExportSettings {
  defaultFormat: ExportFormat;
  dateFormat: DateFormat;
}

interface UserSettings {
  notifications: NotificationSettings;
  exports: ExportSettings;
}

interface SettingsContextType {
  settings: UserSettings;
  updateNotifications: (notifications: Partial<NotificationSettings>) => void;
  updateExports: (exports: Partial<ExportSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: UserSettings = {
  notifications: {
    email: true,
    browser: true,
  },
  exports: {
    defaultFormat: 'pdf',
    dateFormat: 'MM/DD/YYYY',
  },
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem('user-settings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('user-settings', JSON.stringify(settings));
    }
  }, [settings, mounted]);

  const updateNotifications = (notifications: Partial<NotificationSettings>) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, ...notifications },
    }));
  };

  const updateExports = (exports: Partial<ExportSettings>) => {
    setSettings((prev) => ({
      ...prev,
      exports: { ...prev.exports, ...exports },
    }));
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    localStorage.removeItem('user-settings');
  };

  return (
    <SettingsContext.Provider
      value={{ settings, updateNotifications, updateExports, resetSettings }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, Palette, Download, Bell, Users, Shield, Database } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useSettings, ExportFormat, DateFormat } from '@/contexts/SettingsContext';

const ThemeToggle = dynamic(() => import('@/components/theme/ThemeToggle').then(mod => ({ default: mod.ThemeToggle })), { ssr: false });

export default function AdminSettingsPage() {
  const { settings, updateNotifications, updateExports } = useSettings();
  const [activeTab, setActiveTab] = useState<'appearance' | 'exports' | 'notifications' | 'system'>('appearance');

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Theme and display settings' },
    { id: 'exports', label: 'Exports', icon: Download, description: 'Export preferences and formats' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email and browser notifications' },
    { id: 'system', label: 'System', icon: Database, description: 'System configuration' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
          <SettingsIcon className="h-6 w-6 text-purple-600 dark:text-purple-300" />
        </div>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>Settings</h1>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Manage your preferences and system configuration
          </p>
        </div>
      </div>

      {/* Settings Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', borderWidth: '1px' }}>
            <nav className="space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 rounded-lg text-left transition-colors"
                    style={{
                      backgroundColor: activeTab === tab.id ? 'var(--muted)' : 'transparent',
                      color: activeTab === tab.id ? 'var(--foreground)' : 'var(--muted-foreground)',
                    }}
                    onMouseEnter={(e) => {
                      if (activeTab !== tab.id) {
                        e.currentTarget.style.backgroundColor = 'var(--muted)';
                        e.currentTarget.style.opacity = '0.7';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (activeTab !== tab.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.opacity = '1';
                      }
                    }}
                  >
                    <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{tab.label}</p>
                      <p className="text-xs mt-0.5 opacity-75">{tab.description}</p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)', borderWidth: '1px' }}>
            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                    Appearance
                  </h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
                    Customize the look and feel of your admin panel
                  </p>

                  <div className="space-y-4">
                    {/* Theme Mode */}
                    <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                          Dark Mode
                        </h4>
                        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                          Switch between light and dark theme
                        </p>
                      </div>
                      <ThemeToggle />
                    </div>

                    {/* Display Density */}
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
                      <h4 className="font-medium mb-3" style={{ color: 'var(--foreground)' }}>
                        Display Density
                      </h4>
                      <select
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          borderColor: 'var(--input-border)',
                          color: 'var(--foreground)'
                        }}
                      >
                        <option value="comfortable">Comfortable</option>
                        <option value="compact">Compact</option>
                        <option value="spacious">Spacious</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Exports Tab */}
            {activeTab === 'exports' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                    Export Settings
                  </h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
                    Configure default export formats and options
                  </p>

                  <div className="space-y-4">
                    {/* Default Format */}
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
                      <label className="block font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                        Default Export Format
                      </label>
                      <select
                        value={settings.exports.defaultFormat}
                        onChange={(e) => updateExports({ defaultFormat: e.target.value as ExportFormat })}
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          borderColor: 'var(--input-border)',
                          color: 'var(--foreground)'
                        }}
                      >
                        <option value="pdf">PDF Document</option>
                        <option value="excel">Excel Spreadsheet</option>
                        <option value="csv">CSV File</option>
                      </select>
                      <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                        This format will be used by default when exporting data
                      </p>
                    </div>

                    {/* Date Format */}
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
                      <label className="block font-medium mb-2" style={{ color: 'var(--foreground)' }}>
                        Date Format
                      </label>
                      <select
                        value={settings.exports.dateFormat}
                        onChange={(e) => updateExports({ dateFormat: e.target.value as DateFormat })}
                        className="w-full px-4 py-2 rounded-lg border"
                        style={{
                          backgroundColor: 'var(--input-bg)',
                          borderColor: 'var(--input-border)',
                          color: 'var(--foreground)'
                        }}
                      >
                        <option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY (European Format)</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Format)</option>
                      </select>
                      <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
                        Choose how dates appear in exported files
                      </p>
                    </div>

                    {/* Auto Export */}
                    <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                          Include Metadata
                        </h4>
                        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                          Add export date and user info to files
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                    Notifications
                  </h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
                    Manage how you receive updates and alerts
                  </p>

                  <div className="space-y-4">
                    {/* Email Notifications */}
                    <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                          Email Notifications
                        </h4>
                        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                          Receive important updates via email
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.email}
                          onChange={(e) => updateNotifications({ email: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    {/* Browser Notifications */}
                    <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                          Browser Notifications
                        </h4>
                        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                          Get push notifications in your browser
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.notifications.browser}
                          onChange={(e) => updateNotifications({ browser: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-purple-600"></div>
                      </label>
                    </div>

                    {/* Activity Alerts */}
                    <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
                      <div className="flex-1">
                        <h4 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>
                          Activity Alerts
                        </h4>
                        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                          Get notified of important system activities
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-500 peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* System Tab */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>
                    System Configuration
                  </h2>
                  <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
                    Advanced system settings and information
                  </p>

                  <div className="space-y-4">
                    {/* System Info */}
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
                      <h4 className="font-medium mb-3" style={{ color: 'var(--foreground)' }}>
                        System Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--muted-foreground)' }}>Version</span>
                          <span style={{ color: 'var(--foreground)' }}>v1.0.0</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--muted-foreground)' }}>Platform</span>
                          <span style={{ color: 'var(--foreground)' }}>Akazi Rwanda Ltd Admin</span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: 'var(--muted-foreground)' }}>Environment</span>
                          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded text-xs font-medium">
                            Production
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Data Management */}
                    <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
                      <h4 className="font-medium mb-3" style={{ color: 'var(--foreground)' }}>
                        Data Management
                      </h4>
                      <div className="space-y-3">
                        <button
                          className="w-full px-4 py-2 rounded-lg font-medium transition-colors"
                          style={{
                            backgroundColor: 'var(--card-bg)',
                            color: 'var(--foreground)',
                            borderWidth: '1px',
                            borderColor: 'var(--card-border)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          <Database className="h-4 w-4 inline mr-2" />
                          Backup Database
                        </button>
                        <button
                          className="w-full px-4 py-2 rounded-lg font-medium transition-colors"
                          style={{
                            backgroundColor: 'var(--card-bg)',
                            color: 'var(--foreground)',
                            borderWidth: '1px',
                            borderColor: 'var(--card-border)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                        >
                          <Users className="h-4 w-4 inline mr-2" />
                          Manage Users
                        </button>
                      </div>
                    </div>

                    {/* Security */}
                    <div className="p-4 rounded-lg border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium mb-1 text-yellow-800 dark:text-yellow-200">
                            Security Notice
                          </h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            Always keep your system updated and review security settings regularly.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

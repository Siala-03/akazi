'use client';

import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Palette, Download, Bell, Database, DollarSign, Shield, Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useSettings, ExportFormat, DateFormat } from '@/contexts/SettingsContext';

const ThemeToggle = dynamic(() => import('@/components/theme/ThemeToggle').then(mod => ({ default: mod.ThemeToggle })), { ssr: false });

export default function AdminSettingsPage() {
  const { settings, updateNotifications, updateExports } = useSettings();
  const [activeTab, setActiveTab] = useState<'appearance' | 'exports' | 'notifications' | 'rates' | 'system'>('appearance');

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: Palette, description: 'Theme and display settings' },
    { id: 'exports', label: 'Exports', icon: Download, description: 'Export preferences and formats' },
    { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Email and browser notifications' },
    { id: 'rates', label: 'Rate Configuration', icon: DollarSign, description: 'Set exporter and worker daily rates' },
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
            {activeTab === 'appearance' && <AppearanceTab updateExports={updateExports} settings={settings} />}
            {activeTab === 'exports' && <ExportsTab settings={settings} updateExports={updateExports} />}
            {activeTab === 'notifications' && <NotificationsTab settings={settings} updateNotifications={updateNotifications} />}
            {activeTab === 'rates' && <RatesTab />}
            {activeTab === 'system' && <SystemTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

function AppearanceTab({ settings, updateExports }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Appearance</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
          Customize the look and feel of your admin panel
        </p>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
            <div className="flex-1">
              <h4 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>Dark Mode</h4>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Switch between light and dark theme</p>
            </div>
            <ThemeToggle />
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
            <h4 className="font-medium mb-3" style={{ color: 'var(--foreground)' }}>Display Density</h4>
            <select className="w-full px-4 py-2 rounded-lg border" style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--foreground)' }}>
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
              <option value="spacious">Spacious</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExportsTab({ settings, updateExports }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Export Settings</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>Configure default export formats and options</p>
        <div className="space-y-4">
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
            <label className="block font-medium mb-2" style={{ color: 'var(--foreground)' }}>Default Export Format</label>
            <select
              value={settings.exports.defaultFormat}
              onChange={(e) => updateExports({ defaultFormat: e.target.value as ExportFormat })}
              className="w-full px-4 py-2 rounded-lg border"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--foreground)' }}
            >
              <option value="pdf">PDF Document</option>
              <option value="excel">Excel Spreadsheet</option>
              <option value="csv">CSV File</option>
            </select>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
            <label className="block font-medium mb-2" style={{ color: 'var(--foreground)' }}>Date Format</label>
            <select
              value={settings.exports.dateFormat}
              onChange={(e) => updateExports({ dateFormat: e.target.value as DateFormat })}
              className="w-full px-4 py-2 rounded-lg border"
              style={{ backgroundColor: 'var(--input-bg)', borderColor: 'var(--input-border)', color: 'var(--foreground)' }}
            >
              <option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (European Format)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (ISO Format)</option>
            </select>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
            <div className="flex-1">
              <h4 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>Include Metadata</h4>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Add export date and user info to files</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab({ settings, updateNotifications }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Notifications</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>Manage how you receive updates and alerts</p>
        <div className="space-y-4">
          {[
            { key: 'email', label: 'Email Notifications', desc: 'Receive important updates via email', checked: settings.notifications.email },
            { key: 'browser', label: 'Browser Notifications', desc: 'Get push notifications in your browser', checked: settings.notifications.browser },
          ].map(({ key, label, desc, checked }) => (
            <div key={key} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
              <div className="flex-1">
                <h4 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>{label}</h4>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => updateNotifications({ [key]: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          ))}
          <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
            <div className="flex-1">
              <h4 className="font-medium mb-1" style={{ color: 'var(--foreground)' }}>Activity Alerts</h4>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Get notified of important system activities</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function RatesTab() {
  const [exporterDailyRate, setExporterDailyRate] = useState('');
  const [workerDailyWage, setWorkerDailyWage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => {
        if (data.settings) {
          setExporterDailyRate(String(data.settings.exporterDailyRate));
          setWorkerDailyWage(String(data.settings.workerDailyWage));
        }
      })
      .catch(() => setErrorMsg('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const eRate = parseInt(exporterDailyRate, 10);
    const wWage = parseInt(workerDailyWage, 10);

    if (isNaN(eRate) || isNaN(wWage) || eRate <= 0 || wWage <= 0) {
      setStatus('error');
      setErrorMsg('Both rates must be positive numbers.');
      return;
    }
    if (wWage >= eRate) {
      setStatus('error');
      setErrorMsg('Worker daily wage must be less than the exporter rate (to maintain a cooperative margin).');
      return;
    }

    setSaving(true);
    setStatus('idle');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exporterDailyRate: eRate, workerDailyWage: wWage }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const eRate = parseInt(exporterDailyRate, 10);
  const wWage = parseInt(workerDailyWage, 10);
  const margin = !isNaN(eRate) && !isNaN(wWage) ? eRate - wWage : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1" style={{ color: 'var(--foreground)' }}>Rate Configuration</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>
          Set the daily rates charged to exporters and paid to workers. The difference is the cooperative's operating margin.
          Changes apply to all new payroll calculations immediately.
        </p>

        {loading ? (
          <div className="flex items-center gap-3 py-8 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading current rates…</span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Exporter rate */}
            <div className="p-5 rounded-xl border-2 border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200">Rate Charged to Exporters</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-0.5">
                    Amount billed per worker per working day
                  </p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded-full whitespace-nowrap">Revenue</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-blue-700 dark:text-blue-400">FRw</span>
                <input
                  type="number"
                  min="1"
                  value={exporterDailyRate}
                  onChange={(e) => setExporterDailyRate(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border-2 border-blue-200 dark:border-blue-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* Worker wage */}
            <div className="p-5 rounded-xl border-2 border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-900/10">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h4 className="font-semibold text-emerald-900 dark:text-emerald-200">Daily Wage Paid to Workers</h4>
                  <p className="text-sm text-emerald-700 dark:text-emerald-400 mt-0.5">
                    Amount paid to each worker per working day
                  </p>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 bg-emerald-100 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-full whitespace-nowrap">Cost</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-semibold text-emerald-700 dark:text-emerald-400">FRw</span>
                <input
                  type="number"
                  min="1"
                  value={workerDailyWage}
                  onChange={(e) => setWorkerDailyWage(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 rounded-lg border-2 border-emerald-200 dark:border-emerald-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* Margin preview */}
            {margin !== null && (
              <div className={`p-4 rounded-xl border-2 ${margin > 0 ? 'border-purple-100 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-900/10' : 'border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium ${margin > 0 ? 'text-purple-700 dark:text-purple-300' : 'text-red-700 dark:text-red-400'}`}>
                      Cooperative Margin per Worker-Day
                    </p>
                    <p className={`text-xs mt-0.5 ${margin > 0 ? 'text-purple-500 dark:text-purple-400' : 'text-red-500'}`}>
                      {margin > 0 ? 'Exporter rate − Worker wage' : 'Worker wage must be less than exporter rate'}
                    </p>
                  </div>
                  <p className={`text-2xl font-bold ${margin > 0 ? 'text-purple-800 dark:text-purple-200' : 'text-red-700'}`}>
                    FRw {margin.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Status messages */}
            {status === 'success' && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-green-700 dark:text-green-300 text-sm">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Rates saved successfully. New calculations will use these values.
              </div>
            )}
            {status === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                These rates are confidential and only visible to admins.
              </p>
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors shadow-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save Rates'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SystemTab() {
  const [supervisorCanEdit, setSupervisorCanEdit] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => {
        if (data.settings) setSupervisorCanEdit(data.settings.supervisorCanEditWorkers ?? true);
      });
  }, []);

  const handleToggle = async (value: boolean) => {
    setSupervisorCanEdit(value);
    setSaving(true);
    try {
      const current = await fetch('/api/admin/settings').then(r => r.json());
      await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exporterDailyRate: current.settings.exporterDailyRate,
          workerDailyWage: current.settings.workerDailyWage,
          supervisorCanEditWorkers: value,
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>System Configuration</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--muted-foreground)' }}>Advanced system settings and information</p>
        <div className="space-y-4">

          {/* Portal Permissions */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
            <h4 className="font-medium mb-3" style={{ color: 'var(--foreground)' }}>Portal Permissions</h4>
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>Allow Supervisors to Edit Worker Details</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                  When disabled, supervisors can view workers but cannot modify their information
                </p>
              </div>
              <label className={`relative inline-flex items-center ${saving ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}>
                <input
                  type="checkbox"
                  checked={supervisorCanEdit ?? true}
                  onChange={e => handleToggle(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
            <h4 className="font-medium mb-3" style={{ color: 'var(--foreground)' }}>System Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span style={{ color: 'var(--muted-foreground)' }}>Version</span>
                <span style={{ color: 'var(--foreground)' }}>v1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--muted-foreground)' }}>Platform</span>
                <span style={{ color: 'var(--foreground)' }}>Akazi Admin</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: 'var(--muted-foreground)' }}>Environment</span>
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded text-xs font-medium">Production</span>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
            <h4 className="font-medium mb-3" style={{ color: 'var(--foreground)' }}>Data Management</h4>
            <div className="space-y-3">
              {[
                { icon: Database, label: 'Backup Database' },
                { icon: Users, label: 'Manage Users' },
              ].map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  className="w-full px-4 py-2 rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: 'var(--card-bg)', color: 'var(--foreground)', borderWidth: '1px', borderColor: 'var(--card-border)' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  <Icon className="h-4 w-4 inline mr-2" />
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-lg border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium mb-1 text-yellow-800 dark:text-yellow-200">Security Notice</h4>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Always keep your system updated and review security settings regularly.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

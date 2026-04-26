'use client';

import { ReactNode, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Building2,
    BarChart3,
    LogOut,
    Menu,
    X,
    Coffee,
    GitBranch,
    ClipboardList,
    Shield,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const SettingsModal = dynamic(() => import('@/components/settings/SettingsModal').then(mod => ({ default: mod.SettingsModal })), { ssr: false });
const SidebarProfile = dynamic(() => import('@/components/wrappers/SidebarProfile').then(mod => ({ default: mod.SidebarProfile })), { ssr: false });

const navigation = [
    { name: 'Dashboard',       href: '/admin/dashboard',        icon: LayoutDashboard },
    { name: 'Workers',         href: '/admin/workers',           icon: Users },
    { name: 'Supervisors',     href: '/admin/supervisors',       icon: Shield },
    { name: 'Exporters',       href: '/admin/exporters',         icon: Building2 },
    { name: 'Cooperatives',    href: '/admin/cooperatives',      icon: GitBranch },
    { name: 'Worker Requests', href: '/admin/worker-requests',   icon: ClipboardList },
    { name: 'Reports',         href: '/admin/reports',           icon: BarChart3 },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a]">
            {/* Top Navigation */}
            <nav className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 dark:from-emerald-700 dark:via-teal-700 dark:to-emerald-800 sticky top-0 z-50 shadow-md">
                <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="lg:hidden p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                            >
                                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                            <div className="flex-shrink-0 flex items-center gap-3">
                                <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
                                    <Coffee className="w-5 h-5 text-white" />
                                </div>
                                <div className="hidden sm:block">
                                    <span className="text-lg font-bold text-white tracking-wide">Akazi Rwanda Ltd</span>
                                    <div>
                                        <span className="text-xs font-medium text-white/50">Admin Portal</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleLogout}
                                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                            >
                                <LogOut className="w-4 h-4" />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="flex">
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                <aside className={`fixed lg:sticky top-16 left-0 z-40 w-64 h-[calc(100vh-4rem)] bg-white dark:bg-[#1e293b] border-r border-gray-100 dark:border-gray-700/40 transition-transform duration-300 ease-in-out flex flex-col ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
                    <div className="px-5 pt-6 pb-2">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Menu</p>
                    </div>

                    <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                            const Icon = item.icon;
                            return (
                                <a
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`group relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${isActive ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-800 dark:hover:text-gray-200'}`}
                                >
                                    {isActive && (
                                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 dark:bg-emerald-400 rounded-r-full" />
                                    )}
                                    <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-200 ${isActive ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-gray-100 dark:bg-white/5 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/40'}`}>
                                        <Icon className={`w-4 h-4 transition-colors duration-200 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400'}`} />
                                    </span>
                                    <span className="truncate">{item.name}</span>
                                    {isActive && (
                                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
                                    )}
                                </a>
                            );
                        })}
                    </nav>

                    <SidebarProfile profileHref="/admin/profile" onSettingsClick={() => setShowSettings(true)} />
                </aside>

                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto min-h-[calc(100vh-4rem)] bg-[#f8fafc] dark:bg-[#0f172a]">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>

            <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
        </div>
    );
}

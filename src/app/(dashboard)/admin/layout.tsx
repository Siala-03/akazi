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
    FileSpreadsheet,
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
    { name: 'Payroll',         href: '/admin/payroll',           icon: FileSpreadsheet },
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
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Top Navigation */}
            <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="lg:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center shadow-sm">
                                    <Coffee className="w-4 h-4 text-white" />
                                </div>
                                <div className="hidden sm:block">
                                    <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Akazi Rwanda</span>
                                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Admin Portal</div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Sign out</span>
                        </button>
                    </div>
                </div>
            </nav>

            <div className="flex">
                {/* Overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside className={`
                    fixed lg:sticky top-16 left-0 z-40 w-60 h-[calc(100vh-4rem)]
                    bg-white dark:bg-slate-900
                    border-r border-slate-200 dark:border-slate-800
                    flex flex-col
                    transition-transform duration-300 ease-in-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                `}>
                    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                        <p className="px-2 mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Navigation
                        </p>
                        {navigation.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                            const Icon = item.icon;
                            return (
                                <a
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`
                                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150
                                        ${isActive
                                            ? 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                                        }
                                    `}
                                >
                                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}`} />
                                    <span className="truncate">{item.name}</span>
                                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />}
                                </a>
                            );
                        })}
                    </nav>

                    <SidebarProfile profileHref="/admin/profile" onSettingsClick={() => setShowSettings(true)} />
                </aside>

                {/* Main content */}
                <main className="flex-1 min-h-[calc(100vh-4rem)] overflow-auto">
                    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                        {children}
                    </div>
                </main>
            </div>

            <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
        </div>
    );
}

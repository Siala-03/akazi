'use client';

import { ReactNode, useState, useEffect } from 'react';
import Link from 'next/link';
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
    Activity,
    ShieldAlert,
    ChevronDown,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Breadcrumb } from '@/components/Breadcrumb';
import { AdminTopbarExtras } from '@/components/AdminTopbarExtras';
import { InactivityLogout } from '@/components/InactivityLogout';

const SettingsModal = dynamic(() => import('@/components/settings/SettingsModal').then(mod => ({ default: mod.SettingsModal })), { ssr: false });
const SidebarProfile = dynamic(() => import('@/components/wrappers/SidebarProfile').then(mod => ({ default: mod.SidebarProfile })), { ssr: false });

interface NavLink {
    name: string;
    href: string;
    icon: typeof LayoutDashboard;
}

interface NavGroup {
    groupName: string;
    icon: typeof LayoutDashboard;
    items: NavLink[];
}

type NavEntry = NavLink | NavGroup;

function isGroup(entry: NavEntry): entry is NavGroup {
    return 'groupName' in entry;
}

const navigation: NavEntry[] = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    {
        groupName: 'People',
        icon: Users,
        items: [
            { name: 'Workers', href: '/admin/workers', icon: Users },
            { name: 'Supervisors', href: '/admin/supervisors', icon: Shield },
            { name: 'Supervisor Performance', href: '/admin/supervisor-performance', icon: Activity },
            { name: 'NAEB Users', href: '/admin/naeb-users', icon: Shield },
        ],
    },
    {
        groupName: 'Exporters',
        icon: Building2,
        items: [
            { name: 'Exporters', href: '/admin/exporters', icon: Building2 },
            { name: 'Cooperatives', href: '/admin/cooperatives', icon: GitBranch },
            { name: 'Worker Requests', href: '/admin/worker-requests', icon: ClipboardList },
        ],
    },
    {
        groupName: 'Finance',
        icon: FileSpreadsheet,
        items: [
            { name: 'Payroll', href: '/admin/payroll', icon: FileSpreadsheet },
            { name: 'Invoice Breakdown', href: '/admin/invoice-breakdown', icon: FileSpreadsheet },
            { name: 'Reports', href: '/admin/reports', icon: BarChart3 },
        ],
    },
];

const superAdminNavigation: NavLink[] = [
    { name: 'System Control', href: '/admin/system-control', icon: ShieldAlert },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => setIsSuperAdmin(!!data.user?.isSuperAdmin))
            .catch(() => {});
    }, []);

    // Auto-expand whichever group contains the current page
    useEffect(() => {
        for (const entry of navigation) {
            if (isGroup(entry) && entry.items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'))) {
                setOpenGroups(prev => new Set(prev).add(entry.groupName));
            }
        }
    }, [pathname]);

    const toggleGroup = (groupName: string) => {
        setOpenGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupName)) next.delete(groupName); else next.add(groupName);
            return next;
        });
    };

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
        router.refresh();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:bg-[#0f172a]">
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
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center">
                                    <Coffee className="w-5 h-5 text-white" />
                                </div>
                                <div className="hidden sm:block">
                                    <span className="text-lg font-bold text-white tracking-wide">Akazi</span>
                                    <div>
                                        <span className="text-xs font-medium text-white/50">Admin Portal</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <AdminTopbarExtras />
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
                        {navigation.map((entry) => {
                            if (isGroup(entry)) {
                                const isOpen = openGroups.has(entry.groupName);
                                const GroupIcon = entry.icon;
                                const groupHasActive = entry.items.some(item => pathname === item.href || pathname.startsWith(item.href + '/'));
                                return (
                                    <div key={entry.groupName}>
                                        <button
                                            onClick={() => toggleGroup(entry.groupName)}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${groupHasActive ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-800 dark:hover:text-gray-200'}`}
                                        >
                                            <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0">
                                                <GroupIcon className={`w-4 h-4 ${groupHasActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`} />
                                            </span>
                                            <span className="truncate flex-1 text-left">{entry.groupName}</span>
                                            <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        {isOpen && (
                                            <div className="ml-4 pl-4 border-l border-gray-100 dark:border-gray-700/60 space-y-0.5 mt-0.5 mb-1">
                                                {entry.items.map(item => (
                                                    <SidebarLink key={item.name} item={item} pathname={pathname} onClick={() => setSidebarOpen(false)} />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            }
                            return <SidebarLink key={entry.name} item={entry} pathname={pathname} onClick={() => setSidebarOpen(false)} />;
                        })}
                        {isSuperAdmin && superAdminNavigation.map(item => (
                            <SidebarLink key={item.name} item={item} pathname={pathname} onClick={() => setSidebarOpen(false)} />
                        ))}
                    </nav>

                    <SidebarProfile profileHref="/admin/profile" onSettingsClick={() => setShowSettings(true)} />
                </aside>

                <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto min-h-[calc(100vh-4rem)] bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:bg-[#0f172a]">
                    <div className="max-w-7xl mx-auto">
                        <Breadcrumb />
                        {children}
                    </div>
                </main>
            </div>

            <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
            <InactivityLogout />
        </div>
    );
}

function SidebarLink({ item, pathname, onClick }: { item: NavLink; pathname: string; onClick: () => void }) {
    const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
    const Icon = item.icon;
    return (
        <Link
            href={item.href}
            onClick={onClick}
            className={`group relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${isActive ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-800 dark:hover:text-gray-200'}`}
        >
            {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-emerald-500 dark:bg-emerald-400 rounded-r-full" />
            )}
            <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-200">
                <Icon className={`w-4 h-4 transition-colors duration-200 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-emerald-500 dark:group-hover:text-emerald-400'}`} />
            </span>
            <span className="truncate">{item.name}</span>
            {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
            )}
        </Link>
    );
}

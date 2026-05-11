'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

const routeLabels: Record<string, string> = {
    admin: 'Admin',
    supervisor: 'Supervisor',
    exporter: 'Exporter',
    dashboard: 'Dashboard',
    workers: 'Workers',
    supervisors: 'Supervisors',
    exporters: 'Exporters',
    cooperatives: 'Cooperatives',
    'worker-requests': 'Worker Requests',
    payroll: 'Payroll',
    reports: 'Reports',
    profile: 'Profile',
    settings: 'Settings',
    operations: 'Daily Operations',
    onboarding: 'Onboarding',
};

export function Breadcrumb() {
    const pathname = usePathname();
    const segments = pathname.split('/').filter(Boolean);

    if (segments.length <= 2) return null;

    const crumbs = segments.map((seg, i) => {
        const href = '/' + segments.slice(0, i + 1).join('/');
        const label = routeLabels[seg] ?? seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const isLast = i === segments.length - 1;
        return { href, label, isLast };
    });

    return (
        <nav className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-4">
            <Link href={crumbs[0].href} className="flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                <Home className="w-3 h-3" />
            </Link>
            {crumbs.map((crumb) => (
                <span key={crumb.href} className="flex items-center gap-1">
                    <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600" />
                    {crumb.isLast ? (
                        <span className="font-medium text-gray-700 dark:text-gray-300">{crumb.label}</span>
                    ) : (
                        <Link href={crumb.href} className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                            {crumb.label}
                        </Link>
                    )}
                </span>
            ))}
        </nav>
    );
}

import { type LucideIcon } from 'lucide-react';

interface PageHeaderProps {
    icon: LucideIcon;
    iconColor?: string;
    iconBg?: string;
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export function PageHeader({
    icon: Icon,
    iconColor = 'text-emerald-600',
    iconBg = 'bg-emerald-100 dark:bg-emerald-900/30',
    title,
    subtitle,
    action,
}: PageHeaderProps) {
    return (
        <div className="flex flex-col items-start justify-between gap-4 pb-5 mb-6 border-b border-gray-200 dark:border-gray-700/60 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div>
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 leading-tight">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
                    )}
                </div>
            </div>
            {action && <div className="w-full sm:w-auto sm:shrink-0">{action}</div>}
        </div>
    );
}

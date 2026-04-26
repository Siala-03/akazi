'use client';

import { Settings, User } from 'lucide-react';

interface SidebarProfileProps {
    profileHref: string;
    onSettingsClick: () => void;
}

export function SidebarProfile({ profileHref, onSettingsClick }: SidebarProfileProps) {
    return (
        <div className="px-3 py-3 border-t border-gray-100 dark:border-gray-700/40">
            <div className="flex items-center gap-2 px-2 py-2 rounded-xl bg-gray-50 dark:bg-white/5">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>

                {/* Label */}
                <span className="flex-1 text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
                    My Account
                </span>

                {/* Profile icon link */}
                <a
                    href={profileHref}
                    title="Profile"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400 transition-all"
                >
                    <User className="w-3.5 h-3.5" />
                </a>

                {/* Settings icon button */}
                <button
                    onClick={onSettingsClick}
                    title="Settings"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400 transition-all"
                >
                    <Settings className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
}

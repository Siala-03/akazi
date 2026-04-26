'use client';

import { useTheme } from '@/contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { mode, toggleMode } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="p-2 rounded-lg w-9 h-9" />
    );
  }

  return (
    <button
      onClick={toggleMode}
      className="p-2 rounded-lg transition-colors"
      style={{ color: 'var(--foreground)' }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--muted)'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      aria-label="Toggle theme"
      title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
    >
      {mode === 'light' ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5 text-yellow-500" />
      )}
    </button>
  );
}

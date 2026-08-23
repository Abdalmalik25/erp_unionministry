import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { cn } from './utils';

type Theme = 'light' | 'dark' | 'system';

const OPTIONS: { value: Theme; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'فاتح' },
  { value: 'dark', icon: Moon, label: 'داكن' },
  { value: 'system', icon: Monitor, label: 'نظام' },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <button
        aria-label="تبديل المظهر"
        className={cn(
          'p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors',
          className
        )}
        type="button"
      >
        <Monitor size={20} />
      </button>
    );
  }

  const active = (theme as Theme) || 'system';

  return (
    <div
      className={cn(
        'flex items-center gap-0.5 p-1 rounded-lg bg-muted border border-border',
        className
      )}
      role="group"
      aria-label="تبديل المظهر"
    >
      {OPTIONS.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          title={label}
          aria-label={label}
          aria-pressed={active === value}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            active === value
              ? 'bg-card text-primary shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent'
          )}
        >
          {value === 'system' && !resolvedTheme ? (
            <Monitor size={16} />
          ) : (
            <Icon size={16} />
          )}
        </button>
      ))}
    </div>
  );
}
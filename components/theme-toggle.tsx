'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const options = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
] as const;

export function ThemeToggle() {
  const t = useTranslations('themeSwitcher');
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  return (
    <div
      className="flex items-center gap-0.5 rounded-full border border-border bg-secondary/60 p-0.5"
      role="group"
      aria-label={t('label')}
    >
      {options.map(({ value, icon: Icon }) => {
        const isActive = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-pressed={isActive}
            aria-label={t(value)}
            title={t(value)}
            className={cn(
              'rounded-full p-1.5 text-muted-foreground transition-colors hover:text-foreground',
              isActive && 'bg-background text-foreground shadow-sm',
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}

/** Compact single-button variant used in narrow viewports. */
export function ThemeToggleIcon() {
  const t = useTranslations('themeSwitcher');
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => setMounted(true), []);

  const next = resolvedTheme === 'dark' ? 'light' : 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={t('label')}
      onClick={() => setTheme(next)}
      className="rounded-full"
    >
      {mounted && resolvedTheme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  );
}

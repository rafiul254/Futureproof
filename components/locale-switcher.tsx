'use client';

import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from '@/i18n/navigation';
import { type Locale, localeLabels, locales } from '@/i18n/routing';
import { cn } from '@/lib/utils';

/**
 * Switches language while keeping the current route and params.
 * The choice is persisted by next-intl in the NEXT_LOCALE cookie.
 */
export function LocaleSwitcher() {
  const t = useTranslations('localeSwitcher');
  const activeLocale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === activeLocale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  const other = locales.find((l) => l !== activeLocale) as Locale;

  return (
    <div className="flex items-center gap-1">
      <span className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
        <Languages className="size-4" aria-hidden="true" />
        <span className="sr-only">{t('label')}</span>
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => switchTo(other)}
        disabled={isPending}
        aria-label={t('switchTo', { language: localeLabels[other].native })}
        className={cn('gap-1.5 rounded-full', isPending && 'opacity-60')}
      >
        <span lang={other}>{localeLabels[other].native}</span>
      </Button>
    </div>
  );
}

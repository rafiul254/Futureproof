'use client';

import { Building2, GraduationCap, Stamp } from 'lucide-react';
import { useTranslations } from 'next-intl';

const ITEMS = [
  { icon: Stamp, label: 'comingNext1' },
  { icon: Building2, label: 'comingNext2' },
  { icon: GraduationCap, label: 'comingNext3' },
] as const;

export function ComingNext() {
  const t = useTranslations('results');

  return (
    <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-5">
      <p className="mb-4 text-sm font-medium">{t('comingNextTitle')}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {ITEMS.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-start gap-2.5 text-sm text-muted-foreground">
            <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
              <Icon className="size-3.5" aria-hidden="true" />
            </span>
            <span>{t(label)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

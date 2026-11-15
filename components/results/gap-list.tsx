'use client';

import { useLocale, useTranslations } from 'next-intl';

import type { GapAnalysis } from '@/lib/analysis/gap';
import { Progress } from '@/components/ui/progress';

export function GapList({ gap }: { gap: GapAnalysis }) {
  const t = useTranslations('results');
  const locale = useLocale();

  const title = gap.target.titleBn && locale === 'bn' ? gap.target.titleBn : gap.target.title;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t('gapsTarget', { role: title })}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t('gapsCoverage', { coverage: `${Math.round(gap.coverage * 100)}%` })}
          </span>
          <span className="tabular-nums">{Math.round(gap.coverage * 100)}%</span>
        </div>
        <Progress value={Math.round(gap.coverage * 100)} />
      </div>

      {gap.gaps.length === 0 ? (
        <p className="rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
          {t('gapsEmpty')}
        </p>
      ) : (
        <ol className="space-y-2">
          {gap.gaps.slice(0, 8).map((item, index) => (
            <li
              key={item.skillId}
              className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-6 items-center justify-center rounded-md bg-secondary text-xs font-semibold tabular-nums text-muted-foreground">
                  {index + 1}
                </span>
                <span className="text-sm font-medium">
                  {item.nameBn && locale === 'bn' ? item.nameBn : item.name}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="hidden sm:inline">
                  {t('gapsImportance')}:{' '}
                  <span className="tabular-nums">{item.importance.toFixed(2)}</span>
                </span>
                <span>
                  {t('gapsPriority')}:{' '}
                  <span className="tabular-nums">{item.priority.toFixed(2)}</span>
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

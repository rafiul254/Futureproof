'use client';

import { ArrowRight } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import type { AdjacentRole } from '@/lib/analysis/gap';

export function AdjacentRoles({ roles }: { roles: AdjacentRole[] }) {
  const t = useTranslations('results');
  const locale = useLocale();

  if (roles.length === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {roles.map((role, index) => {
        const title = role.titleBn && locale === 'bn' ? role.titleBn : role.title;
        return (
          <div key={role.occupationId} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium leading-snug">{title}</p>
              {index === 0 ? (
                <Badge variant="accent" className="shrink-0 text-[10px]">
                  1
                </Badge>
              ) : null}
            </div>

            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t('adjacentOverlap')}</dt>
                <dd className="font-medium tabular-nums">{Math.round(role.overlap * 100)}%</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t('adjacentResilience')}</dt>
                <dd className="font-medium tabular-nums">{Math.round(role.resilience * 100)}%</dd>
              </div>
            </dl>

            {role.missingSkills.length > 0 ? (
              <div className="mt-4 border-t border-border pt-3">
                <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ArrowRight className="size-3" aria-hidden="true" />
                  {t('adjacentMissing')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {role.missingSkills.map((skill) => (
                    <Badge key={skill.skillId} variant="outline" className="text-[11px]">
                      {skill.nameBn && locale === 'bn' ? skill.nameBn : skill.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 border-t border-border pt-3 text-xs text-accent">
                {t('gapsEmpty')}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

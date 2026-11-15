'use client';

import { ExternalLink, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { LearningPathResult } from '@/lib/ai/plan';

/**
 * The 4-week plan. Courses come only from verified rows of the database,
 * so no link here can point at an unverified resource.
 */
export function LearningPath({
  analysisId,
  initial,
}: {
  analysisId: string;
  initial: LearningPathResult | null;
}) {
  const t = useTranslations('results');
  const [plan, setPlan] = useState<LearningPathResult | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/analysis/${analysisId}/path`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ locale: 'en' }),
      });
      const payload = (await response.json()) as LearningPathResult & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Failed');
      setPlan(payload);
    } catch {
      setError(t('pathEmpty'));
    } finally {
      setLoading(false);
    }
  }

  if (!plan) {
    return (
      <div className="space-y-3 rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-sm text-muted-foreground">{t('pathHint')}</p>
        <Button onClick={generate} disabled={loading}>
          <Sparkles className="size-4" aria-hidden="true" />
          {loading ? t('pathGenerating') : t('pathGenerate')}
        </Button>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    );
  }

  if (plan.weeks.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
        {t('pathEmpty')}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="relative space-y-4 border-l border-border pl-6">
        {plan.weeks.map((week) => (
          <li key={week.week} className="relative">
            <span
              className="absolute -left-[31px] top-1 flex size-4 items-center justify-center rounded-full border-2 border-background bg-accent"
              aria-hidden="true"
            />
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-semibold">{t('pathWeek', { week: week.week })}</p>
                <span className="text-xs text-muted-foreground">
                  {t('pathHours', { hours: Math.round(week.estimatedHours) })}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{week.goal}</p>

              {week.courses.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {week.courses.map((course) => (
                    <li key={course.id} className="flex items-start gap-2 text-sm">
                      {course.url ? (
                        <a
                          href={course.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-start gap-1.5 font-medium text-accent hover:underline"
                        >
                          {course.title}
                          <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="font-medium">{course.title}</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {course.provider ? `· ${course.provider}` : ''}
                      </span>
                      <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">
                        {course.costUsd === 0 ? t('pathFree') : `$${course.costUsd.toFixed(0)}`}
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : null}

              <p className="mt-3 rounded-lg bg-secondary/40 p-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{t('pathPractice')}: </span>
                {week.practiceTask}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <p className="text-xs text-muted-foreground">
        {t('pathSourceNote', {
          source: plan.source === 'llm' ? (plan.model ?? 'AI') : 'rules',
          count: new Set(plan.weeks.flatMap((w) => w.courses.map((c) => c.id))).size,
        })}
      </p>
    </div>
  );
}

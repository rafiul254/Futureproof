'use client';

import { ChevronDown, ExternalLink } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Fragment, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Link } from '@/i18n/navigation';
import type { Quadrant } from '@/lib/scoring/config';
import type { SkillScoreBreakdown } from '@/lib/scoring/score';
import { cn } from '@/lib/utils';

const QUADRANT_VARIANT: Record<Quadrant, 'invest' | 'adapt' | 'niche' | 'transition'> = {
  invest: 'invest',
  adapt: 'adapt',
  niche: 'niche',
  transition: 'transition',
};

function Bar({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn('h-full rounded-full', tone)}
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{(value * 100).toFixed(0)}</span>
    </div>
  );
}

export function SkillTable({
  skills,
  skillNames,
  skillNamesBn,
  proficiencyLabels,
}: {
  skills: SkillScoreBreakdown[];
  skillNames: Record<string, string>;
  skillNamesBn: Record<string, string>;
  proficiencyLabels: Record<string, string>;
}) {
  const t = useTranslations('results');
  const tScore = useTranslations('score');
  const tQuadrant = useTranslations('quadrant');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = [...skills].sort((a, b) => b.score - a.score);

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                {t('skillColumn')}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {t('proficiencyColumn')}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {t('demandColumn')}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {t('resilienceColumn')}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {t('scoreColumn')}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {t('quadrantColumn')}
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                {t('confidenceColumn')}
              </th>
              <th scope="col" className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sorted.map((skill) => {
              const isOpen = openId === skill.skillId;
              const fallback = skillNames[skill.skillId] ?? skill.skillId;
              const label = locale === 'bn' ? (skillNamesBn[skill.skillId] ?? fallback) : fallback;

              return (
                <Fragment key={skill.skillId}>
                  <tr className={cn('transition-colors', isOpen && 'bg-secondary/30')}>
                    <td className="px-4 py-3 font-medium">{label}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {proficiencyLabels[String(skill.proficiency)] ?? skill.proficiency}
                    </td>
                    <td className="px-4 py-3">
                      {skill.demand.available ? (
                        <Bar value={skill.demand.value} tone="bg-primary" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{tCommon('noData')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {skill.exposure.taskCount > 0 ? (
                        <Bar value={skill.resilience} tone="bg-accent" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{tCommon('noData')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {skill.includedInOverall ? (
                        <span className="font-semibold tabular-nums">{skill.score.toFixed(0)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {tScore('insufficient')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {skill.includedInOverall ? (
                        <Badge variant={QUADRANT_VARIANT[skill.quadrant]}>
                          {tQuadrant(skill.quadrant)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">{tCommon('noData')}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-muted-foreground">
                        {tScore(
                          skill.confidence === 'insufficient' ? 'insufficient' : skill.confidence,
                        )}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() => setOpenId(isOpen ? null : skill.skillId)}
                        aria-expanded={isOpen}
                        aria-label={`${t('whyTitle')} — ${label}`}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <ChevronDown
                          className={cn('size-4 transition-transform', isOpen && 'rotate-180')}
                        />
                      </button>
                    </td>
                  </tr>

                  {isOpen ? (
                    <tr className="bg-secondary/20">
                      <td colSpan={8} className="px-4 pb-5 pt-1">
                        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                          <p className="text-sm font-medium">{t('whyTitle')}</p>

                          <p className="text-sm text-muted-foreground">
                            {t('whyDemand', {
                              value: skill.demand.value.toFixed(2),
                              percentile: (skill.demand.percentile * 100).toFixed(0),
                              trend: `${skill.demand.trend >= 0 ? '+' : ''}${(skill.demand.trend * 100).toFixed(0)}%`,
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {t('whyResilience', {
                              value: skill.resilience.toFixed(2),
                              count: skill.exposure.taskCount,
                            })}
                          </p>

                          <p className="flex flex-wrap items-center gap-2 text-xs">
                            <span className="text-muted-foreground">
                              {t('whyMethod', {
                                method:
                                  skill.exposure.method === 'published_dataset'
                                    ? tCommon('publishedData')
                                    : skill.exposure.method === 'llm_estimated'
                                      ? tCommon('aiEstimated')
                                      : tCommon('mixed'),
                              })}
                            </span>
                            {skill.exposure.method !== 'published_dataset' ? (
                              <Badge variant="outline" className="text-[10px]">
                                {tCommon('aiEstimated')}
                              </Badge>
                            ) : null}
                          </p>

                          {skill.tasks.length > 0 ? (
                            <div>
                              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                                {t('whyTasks')}
                              </p>
                              <ul className="space-y-1">
                                {skill.tasks.slice(0, 6).map((task) => (
                                  <li
                                    key={task.id}
                                    className="flex items-start justify-between gap-3 text-xs"
                                  >
                                    <span className="text-muted-foreground">
                                      {task.description}
                                    </span>
                                    <span className="shrink-0 tabular-nums text-muted-foreground">
                                      {(task.aiExposure * 100).toFixed(0)}%
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">{t('whyNoTasks')}</p>
                          )}

                          {skill.evidence ? (
                            <p className="border-l-2 border-accent/40 pl-3 text-xs italic text-muted-foreground">
                              “{skill.evidence.slice(0, 220)}”
                            </p>
                          ) : null}

                          <Link
                            href="/methodology"
                            className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                          >
                            {t('viewMethodology')}
                            <ExternalLink className="size-3" aria-hidden="true" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

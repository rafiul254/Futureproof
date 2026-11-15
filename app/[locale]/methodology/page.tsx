import { getTranslations, setRequestLocale } from 'next-intl/server';
import { getTranslations as getT } from 'next-intl/server';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDataProvider } from '@/lib/data';
import { QUADRANT_MEANING, QUADRANTS, SCORING_WEIGHTS } from '@/lib/scoring/config';

export default async function MethodologyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('methodology');
  const tQuadrant = await getT('quadrant');

  const provider = await getDataProvider();
  const meta = provider.meta;

  const formulas = [
    { label: 'Demand', formula: t('formulaDemand') },
    { label: 'AI exposure', formula: t('formulaExposure') },
    { label: 'AI resilience', formula: t('formulaResilience') },
    { label: 'Skill score', formula: t('formulaSkillScore') },
    { label: 'Overall', formula: t('formulaOverall') },
  ];

  const limitations = [
    t('limitation1'),
    t('limitation2'),
    t('limitation3'),
    t('limitation4'),
    t('limitation5'),
  ];

  return (
    <div className="container max-w-3xl space-y-10 py-12 md:py-16">
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('introTitle')}</h2>
        <p className="leading-relaxed text-muted-foreground">{t('introBody')}</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('formulaTitle')}</h2>
        <div className="space-y-2">
          {formulas.map((item) => (
            <div
              key={item.label}
              className="grid gap-1 rounded-lg border border-border bg-card p-4 md:grid-cols-[140px_1fr] md:gap-4"
            >
              <span className="font-mono text-xs uppercase tracking-wide text-accent">
                {item.label}
              </span>
              <code className="text-sm leading-relaxed text-muted-foreground">{item.formula}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('weightsTitle')}</h2>
        <p className="text-sm text-muted-foreground">{t('weightsBody')}</p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-4 py-2.5 text-muted-foreground">Demand: percentile share</td>
                <td className="px-4 py-2.5 text-right font-mono">
                  {SCORING_WEIGHTS.demand.percentile}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-muted-foreground">Demand: trend share</td>
                <td className="px-4 py-2.5 text-right font-mono">{SCORING_WEIGHTS.demand.trend}</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-muted-foreground">Skill score: demand share</td>
                <td className="px-4 py-2.5 text-right font-mono">
                  {SCORING_WEIGHTS.skillScore.demand}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-muted-foreground">Skill score: resilience share</td>
                <td className="px-4 py-2.5 text-right font-mono">
                  {SCORING_WEIGHTS.skillScore.resilience}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-muted-foreground">Quadrant split point</td>
                <td className="px-4 py-2.5 text-right font-mono">
                  {SCORING_WEIGHTS.quadrantThreshold}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 text-muted-foreground">
                  Proficiency weights (1 / 2 / 3)
                </td>
                <td className="px-4 py-2.5 text-right font-mono">
                  {SCORING_WEIGHTS.proficiencyWeight[1]} / {SCORING_WEIGHTS.proficiencyWeight[2]} /{' '}
                  {SCORING_WEIGHTS.proficiencyWeight[3]}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('quadrantTitle')}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {QUADRANTS.map((quadrant) => (
            <Card key={quadrant} className="border-border/70">
              <CardHeader className="pb-2">
                <Badge variant={quadrant} className="w-fit">
                  {tQuadrant(quadrant)}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {locale === 'bn' ? QUADRANT_MEANING[quadrant].bn : QUADRANT_MEANING[quadrant].en}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('dataTitle')}</h2>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Dataset in this build</CardTitle>
            <CardDescription>{t('dataBody')}</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Stat label="Skills" value={meta.skills} />
              <Stat label="Occupations" value={meta.occupations} />
              <Stat label="Tasks" value={meta.tasks} />
              <Stat label="Courses" value={meta.courses} />
              <Stat label="Verified courses" value={meta.verifiedCourses} />
              <Stat label="Job postings" value={meta.postings} />
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="outline">
                source: {meta.source === 'supabase' ? 'Supabase' : 'curated local seed'}
              </Badge>
              {meta.syntheticPostings > 0 ? (
                <Badge variant="outline">
                  {meta.syntheticPostings} synthetic postings (labelled in the UI)
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('limitationsTitle')}</h2>
        <ul className="space-y-2">
          {limitations.map((limitation) => (
            <li
              key={limitation}
              className="flex gap-2.5 rounded-lg border border-border bg-card p-3 text-sm text-muted-foreground"
            >
              <span
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent"
                aria-hidden="true"
              />
              {limitation}
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">{t('reproducibilityTitle')}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{t('reproducibilityBody')}</p>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

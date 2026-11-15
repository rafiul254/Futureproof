import { FileWarning, Info } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AdjacentRoles } from '@/components/results/adjacent-roles';
import { ComingNext } from '@/components/results/coming-next';
import { GapList } from '@/components/results/gap-list';
import { LearningPath } from '@/components/results/learning-path';
import { RestoreFromBrowser } from '@/components/results/restore-from-browser';
import { QuadrantChart } from '@/components/results/quadrant-chart';
import { ScoreGauge } from '@/components/results/score-gauge';
import { SkillGraph } from '@/components/results/skill-graph';
import { SkillTable } from '@/components/results/skill-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { explainResult } from '@/lib/ai/explain';
import { getAnalysis } from '@/lib/analysis/store';
import { getDataProvider } from '@/lib/data';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'results' });
  return { title: `${t('title')} — ${id.slice(0, 8)}` };
}

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const analysis = await getAnalysis(id);
  // Not on this server (e.g. another serverless instance): let the browser restore its copy.
  if (!analysis) return <RestoreFromBrowser id={id} />;

  const result = analysis.result;
  const t = await getTranslations('results');
  const tScore = await getTranslations('score');
  const tCommon = await getTranslations('common');

  const provider = await getDataProvider();
  const skills = await provider.listSkills();

  // Plain records, not functions: everything crossing into a Client Component
  // has to be serializable.
  const skillNames: Record<string, string> = {};
  const skillNamesBn: Record<string, string> = {};
  for (const skill of skills) {
    skillNames[skill.id] = skill.name;
    if (skill.nameBn) skillNamesBn[skill.id] = skill.nameBn;
  }

  const explanation = await explainResult(result, locale);

  const proficiencyLabels: Record<string, string> = {
    '1': t('proficiency1'),
    '2': t('proficiency2'),
    '3': t('proficiency3'),
  };

  return (
    <div className="container max-w-5xl space-y-8 py-10 md:py-14">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{t('title')}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {result.dataNotes.isSample ? (
              <Badge variant="outline" className="border-accent/40 text-accent">
                {t('sampleBadge')}
              </Badge>
            ) : null}
            <Badge variant="secondary">
              {result.extraction.method === 'llm'
                ? `${t('llmBadge')}${result.extraction.model ? `: ${result.extraction.model}` : ''}`
                : t('offlineBadge')}
            </Badge>
            {result.dataNotes.syntheticPostings ? (
              <Badge variant="outline">{tCommon('sampleData')}</Badge>
            ) : null}
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/analyze">{t('newAnalysis')}</Link>
        </Button>
      </div>

      {/* 1. Score */}
      <section className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
        <Card className="flex justify-center border-border/70 bg-card/60 md:w-[300px]">
          <CardContent className="py-8">
            <ScoreGauge value={result.score.overall} confidence={result.score.overallConfidence} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {result.score.overall === null ? (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileWarning className="size-5" aria-hidden="true" />
                  {t('noScore')}
                </CardTitle>
                <CardDescription>{t('noScoreBody')}</CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">{t('explanationTitle')}</h2>
                <p className="text-base leading-relaxed">{explanation.explanation.headline}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {explanation.explanation.summary}
                </p>
              </div>

              {explanation.explanation.actions.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">{t('actionsTitle')}</h3>
                  <ul className="space-y-1.5">
                    {explanation.explanation.actions.map((action) => (
                      <li key={action} className="flex gap-2 text-sm text-muted-foreground">
                        <span
                          className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent"
                          aria-hidden="true"
                        />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="text-xs text-muted-foreground">
                {tScore('basedOn', {
                  scored: result.score.coverage.scored,
                  total: result.score.coverage.total,
                })}
                {' · '}
                {tScore('estimateNotice')}
              </p>
            </>
          )}
        </div>
      </section>

      {/* 2. Quadrants */}
      <Section title={t('quadrantTitle')}>
        <QuadrantChart skills={result.score.skills} skillNames={skillNames} />
      </Section>

      {/* 3. Skill table */}
      <Section title={t('skillsTitle')}>
        <SkillTable
          skills={result.score.skills}
          skillNames={skillNames}
          skillNamesBn={skillNamesBn}
          proficiencyLabels={proficiencyLabels}
        />
        {result.unmappedSkills.length > 0 ? (
          <div className="rounded-xl border border-border bg-secondary/20 p-4">
            <p className="text-sm font-medium">
              {t('unmappedTitle', { count: result.unmappedSkills.length })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{t('unmappedBody')}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.unmappedSkills.map((skill) => (
                <Badge key={skill.name} variant="outline" className="text-[11px]">
                  {skill.name}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}
      </Section>

      {/* 4. Skill graph */}
      <Section title={t('graphTitle')}>
        <SkillGraph analysisId={id} />
      </Section>

      {/* 5. Gaps */}
      {result.gaps ? (
        <Section
          title={t('gapsTitle')}
          hint={result.target?.autoPicked ? t('gapsAuto') : undefined}
        >
          <GapList gap={result.gaps} />
        </Section>
      ) : null}

      {/* 6. Adjacent roles */}
      <Section title={t('adjacentTitle')} hint={t('adjacentHint')}>
        <AdjacentRoles roles={result.adjacentRoles} />
      </Section>

      {/* 7. Learning path */}
      <Section title={t('pathTitle')} hint={t('pathHint')}>
        <LearningPath analysisId={id} initial={null} />
      </Section>

      {/* 8. Sources + coming next */}
      <Section title={t('sourcesTitle')}>
        <div className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
          <p className="flex items-start gap-2 text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t('sourcesBody', {
              method:
                result.dataNotes.exposureMethods
                  .map((method) =>
                    method === 'published_dataset'
                      ? tCommon('publishedData')
                      : method === 'llm_estimated'
                        ? tCommon('aiEstimated')
                        : tCommon('mixed'),
                  )
                  .join(', ') || tCommon('notAvailable'),
              postings: provider.meta.postings,
              synthetic: result.dataNotes.syntheticPostings
                ? t('syntheticPostings')
                : t('realPostings'),
            })}
          </p>
          <Link
            href="/methodology"
            className="inline-block text-sm text-accent underline-offset-4 hover:underline"
          >
            {t('viewMethodology')}
          </Link>
        </div>
      </Section>

      <ComingNext />
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}

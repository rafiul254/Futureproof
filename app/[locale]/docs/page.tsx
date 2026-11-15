import { FileText, ShieldCheck, Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Link from 'next/link';

import { ArchitectureDiagram } from '@/components/docs/architecture-diagram';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getDataProvider } from '@/lib/data';
import {
  activeEmbeddingProvider,
  activeLlmProvider,
  isSupabaseConfigured,
  modelFor,
} from '@/lib/env';
import { SCORING_WEIGHTS } from '@/lib/scoring/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'docs' });
  return { title: t('meta.title'), description: t('meta.description') };
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

export default async function DocsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('docs');
  const tNav = await getTranslations('nav');

  // Live figures, queried on every request — this page is the dashboard too.
  const provider = await getDataProvider();
  const meta = provider.meta;
  const llm = activeLlmProvider();
  const dbLabel = isSupabaseConfigured() ? t('dash.dbSupabase') : t('dash.dbLocal');
  const embedLabel = activeEmbeddingProvider();
  const renderedAt = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  const stats = [
    { label: t('dash.skills'), value: meta.skills.toLocaleString() },
    { label: t('dash.occupations'), value: meta.occupations.toLocaleString() },
    { label: t('dash.tasks'), value: meta.tasks.toLocaleString() },
    { label: t('dash.courses'), value: meta.courses.toLocaleString() },
    { label: t('dash.verifiedCourses'), value: meta.verifiedCourses.toLocaleString() },
  ];

  const runtime = [
    {
      label: t('dash.llm'),
      value: llm ? `${llm} · ${modelFor(llm)}` : t('dash.llmOffline'),
      ok: Boolean(llm),
    },
    { label: t('dash.db'), value: dbLabel, ok: true },
    { label: t('dash.embeddings'), value: embedLabel, ok: true },
    { label: t('dash.mcp'), value: t('dash.mcpOn'), ok: true },
    { label: t('dash.tests'), value: t('dash.testsValue'), ok: true },
  ];

  const steps = [
    { n: '01', title: t('solution.steps.s1t'), body: t('solution.steps.s1d') },
    { n: '02', title: t('solution.steps.s2t'), body: t('solution.steps.s2d') },
    { n: '03', title: t('solution.steps.s3t'), body: t('solution.steps.s3d') },
    { n: '04', title: t('solution.steps.s4t'), body: t('solution.steps.s4d') },
  ];

  const aiRows = [
    { role: t('ai.rows.r1r'), how: t('ai.rows.r1h'), model: true },
    { role: t('ai.rows.r2r'), how: t('ai.rows.r2h'), model: true },
    { role: t('ai.rows.r3r'), how: t('ai.rows.r3h'), model: false },
    { role: t('ai.rows.r4r'), how: t('ai.rows.r4h'), model: true },
    { role: t('ai.rows.r5r'), how: t('ai.rows.r5h'), model: true },
    { role: t('ai.rows.r6r'), how: t('ai.rows.r6h'), model: true },
  ];

  const mcpTools = [
    { name: 'score_profile', purpose: t('mcp.t1p') },
    { name: 'lookup_skill_demand', purpose: t('mcp.t2p') },
    { name: 'explain_score', purpose: t('mcp.t3p') },
  ];

  const lifecycle = [
    { n: '1', title: t('lifecycle.stages.s1t'), body: t('lifecycle.stages.s1d') },
    { n: '2', title: t('lifecycle.stages.s2t'), body: t('lifecycle.stages.s2d') },
    { n: '3', title: t('lifecycle.stages.s3t'), body: t('lifecycle.stages.s3d') },
    { n: '4', title: t('lifecycle.stages.s4t'), body: t('lifecycle.stages.s4d') },
    { n: '5', title: t('lifecycle.stages.s5t'), body: t('lifecycle.stages.s5d') },
  ];

  const honesty = [
    {
      title: t('honesty.real'),
      tone: 'ok' as const,
      items: [1, 2, 3, 4, 5, 6].map((i) => t(`honesty.realItems.i${i}`)),
    },
    {
      title: t('honesty.synthetic'),
      tone: 'warn' as const,
      items: [1, 2, 3].map((i) => t(`honesty.synthItems.i${i}`)),
    },
    {
      title: t('honesty.notbuilt'),
      tone: 'muted' as const,
      items: [1, 2, 3, 4].map((i) => t(`honesty.notItems.i${i}`)),
    },
  ];

  const securityItems = [1, 2, 3, 4, 5].map((i) => t(`security.items.i${i}`));
  const nextItems = [1, 2, 3, 4, 5].map((i) => t(`next.items.i${i}`));

  return (
    <div className="container max-w-4xl space-y-16 py-12 md:py-16">
      {/* ------------------------------------------------------------ hero */}
      <header className="space-y-5">
        <Badge variant="secondary" className="gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          {t('dash.live')}
        </Badge>

        <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{t('hero.title')}</h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
          {t('hero.subtitle')}
        </p>

        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/analyze">{t('hero.ctaPrimary')}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/methodology">{t('hero.ctaSecondary')}</Link>
          </Button>
        </div>

        <p className="text-sm italic text-muted-foreground">— {t('hero.liveNote')}</p>
      </header>

      {/* ------------------------------------------------------- dashboard */}
      <Section id="dashboard" title={t('dash.title')} subtitle={t('dash.subtitle')}>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('dash.dataset')}</CardTitle>
              <CardDescription>
                {meta.source === 'curated-local' ? t('dash.dbLocal') : t('dash.dbSupabase')}
                {meta.isSynthetic ? ' · synthetic' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-3 gap-4">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <dd className="text-2xl font-semibold tabular-nums">{stat.value}</dd>
                    <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('dash.runtime')}</CardTitle>
              <CardDescription>
                {t('dash.updated')} {renderedAt}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2">
                {runtime.map((row) => (
                  <div key={row.label} className="flex items-center justify-between gap-4 text-sm">
                    <dt className="text-muted-foreground">{row.label}</dt>
                    <dd className="flex items-center gap-2 text-right">
                      <span className="font-mono text-xs">{row.value}</span>
                      <span
                        className={
                          row.ok
                            ? 'h-1.5 w-1.5 rounded-full bg-emerald-500'
                            : 'h-1.5 w-1.5 rounded-full bg-amber-500'
                        }
                        aria-hidden
                      />
                    </dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* --------------------------------------------------------- problem */}
      <Section id="problem" title={t('problem.title')} subtitle={t('problem.subtitle')}>
        <Card>
          <CardContent className="space-y-4 pt-6">
            <p className="leading-relaxed text-muted-foreground">{t('problem.body')}</p>
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
              {t('problem.callout')}
            </p>
          </CardContent>
        </Card>
      </Section>

      {/* -------------------------------------------------------- solution */}
      <Section id="solution" title={t('solution.title')} subtitle={t('solution.subtitle')}>
        <ol className="grid gap-4 sm:grid-cols-2">
          {steps.map((step) => (
            <li key={step.n}>
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <span className="font-mono text-xs text-accent">{step.n}</span>
                  <CardTitle className="text-base">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </Section>

      {/* ----------------------------------------------------- architecture */}
      <Section id="architecture" title={t('arch.title')} subtitle={t('arch.subtitle')}>
        <Card>
          <CardContent className="pt-6">
            <ArchitectureDiagram />
            <p className="mt-4 text-xs text-muted-foreground">{t('arch.caption')}</p>
          </CardContent>
        </Card>
      </Section>

      {/* --------------------------------------------------------- scoring */}
      <Section id="scoring" title={t('scoring.title')} subtitle={t('scoring.subtitle')}>
        <Card>
          <CardContent className="space-y-3 pt-6">
            <div className="overflow-x-auto">
              <pre className="rounded-lg border border-border bg-muted/40 p-4 text-xs leading-relaxed">
                {`demand      = ${SCORING_WEIGHTS.demand.percentile} · percentile(count30d) + ${SCORING_WEIGHTS.demand.trend} · trend01
resilience  = 1 − Σ(importance · aiExposure) / Σ(importance)
skillScore  = 100 · (${SCORING_WEIGHTS.skillScore.demand} · demand + ${SCORING_WEIGHTS.skillScore.resilience} · resilience)
overall     = Σ(proficiency · skillScore) / Σ(proficiency)`}
              </pre>
            </div>
            <Button asChild variant="link" className="px-0">
              <Link href="/methodology">{t('scoring.link')} →</Link>
            </Button>
          </CardContent>
        </Card>
      </Section>

      {/* -------------------------------------------------------------- ai */}
      <Section id="ai" title={t('ai.title')} subtitle={t('ai.subtitle')}>
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 pr-4 font-medium">{t('ai.role')}</th>
                    <th className="pb-2 pr-4 font-medium">{t('ai.how')}</th>
                    <th className="pb-2 font-medium">{t('ai.model')}</th>
                  </tr>
                </thead>
                <tbody>
                  {aiRows.map((row) => (
                    <tr key={row.role} className="border-b border-border/50 last:border-0">
                      <td className="py-3 pr-4 align-top font-medium">{row.role}</td>
                      <td className="py-3 pr-4 align-top text-muted-foreground">{row.how}</td>
                      <td className="py-3 align-top">
                        <Badge variant={row.model ? 'default' : 'secondary'}>
                          {row.model ? t('ai.yes') : t('ai.no')}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* ------------------------------------------------------------- mcp */}
      <Section id="mcp" title={t('mcp.title')} subtitle={t('mcp.subtitle')}>
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="pb-2 pr-4 font-medium">{t('mcp.tool')}</th>
                      <th className="pb-2 font-medium">{t('mcp.purpose')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mcpTools.map((tool) => (
                      <tr key={tool.name} className="border-b border-border/50 last:border-0">
                        <td className="py-3 pr-4 align-top">
                          <code className="font-mono text-xs text-accent">{tool.name}</code>
                        </td>
                        <td className="py-3 align-top text-muted-foreground">{tool.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 flex gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {t('mcp.note')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('mcp.config')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <pre className="overflow-x-auto rounded-lg border border-border bg-muted/40 p-4 text-xs leading-relaxed">
                {`{
  "mcpServers": {
    "futureproof": {
      "command": "npx",
      "args": ["tsx", "/path/to/futureproof/mcp-server/src/index.ts"],
      "cwd": "/path/to/futureproof"
    }
  }
}`}
              </pre>
              <p className="flex gap-2 text-xs text-muted-foreground">
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                {t('mcp.verify')}
              </p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* ------------------------------------------------------- lifecycle */}
      <Section id="lifecycle" title={t('lifecycle.title')} subtitle={t('lifecycle.subtitle')}>
        <ol className="space-y-3">
          {lifecycle.map((stage) => (
            <li key={stage.n} className="flex gap-4 rounded-lg border border-border bg-card p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                {stage.n}
              </span>
              <div className="space-y-1">
                <h3 className="font-medium">{stage.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{stage.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* --------------------------------------------------------- honesty */}
      <Section id="honesty" title={t('honesty.title')} subtitle={t('honesty.subtitle')}>
        <div className="grid gap-4 md:grid-cols-3">
          {honesty.map((column) => (
            <Card key={column.title}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">
                  <span
                    className={
                      column.tone === 'ok'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : column.tone === 'warn'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-muted-foreground'
                    }
                  >
                    {column.title}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm">
                  {column.items.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span
                        aria-hidden
                        className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-50"
                      />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>

      {/* -------------------------------------------------------- security */}
      <Section id="security" title={t('security.title')} subtitle={t('security.subtitle')}>
        <Card>
          <CardContent className="pt-6">
            <ul className="space-y-3">
              {securityItems.map((item) => (
                <li key={item} className="flex gap-3 text-sm">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </Section>

      {/* ------------------------------------------------------------ next */}
      <Section id="next" title={t('next.title')} subtitle={t('next.subtitle')}>
        <ol className="space-y-3">
          {nextItems.map((item, index) => (
            <li key={item} className="flex gap-4 rounded-lg border border-border/60 p-4">
              <span className="font-mono text-xs text-accent">{index + 1}</span>
              <p className="text-sm leading-relaxed text-muted-foreground">{item}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* ----------------------------------------------------------- links */}
      <Section id="links" title={t('links.title')} subtitle={t('links.subtitle')}>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/analyze">{t('links.app')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/methodology">{tNav('methodology')}</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/privacy">{tNav('privacy')}</Link>
          </Button>
        </div>
      </Section>
    </div>
  );
}

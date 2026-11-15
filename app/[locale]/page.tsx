import { ArrowRight, FileUp, Lock, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { QuadrantIllustration } from '@/components/quadrant-illustration';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';

type HomePageProps = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('home');

  const steps = [
    { icon: FileUp, title: t('step1Title'), body: t('step1Body') },
    { icon: TrendingUp, title: t('step2Title'), body: t('step2Body') },
    { icon: Sparkles, title: t('step3Title'), body: t('step3Body') },
  ] as const;

  const trust = [
    { icon: ShieldCheck, title: t('trust1Title'), body: t('trust1Body') },
    { icon: TrendingUp, title: t('trust2Title'), body: t('trust2Body') },
    { icon: Lock, title: t('trust3Title'), body: t('trust3Body') },
  ] as const;

  return (
    <>
      {/* Hero */}
      <section className="bg-glow relative overflow-hidden">
        <div className="grid-pattern absolute inset-0" aria-hidden="true" />
        <div className="container relative py-16 md:py-24">
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className="animate-fade-up space-y-6">
              <Badge variant="outline" className="gap-1.5 border-accent/40 text-accent">
                <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" />
                {t('badge')}
              </Badge>

              <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
                {t('title')}
              </h1>

              <p className="max-w-xl text-pretty text-base text-muted-foreground md:text-lg">
                {t('subtitle')}
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="group">
                  <Link href="/analyze">
                    <FileUp aria-hidden="true" />
                    {t('ctaAnalyze')}
                    <ArrowRight
                      className="transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/analyze?demo=sample">{t('ctaSample')}</Link>
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">{t('noSignupNote')}</p>
            </div>

            <div className="mx-auto w-full max-w-md md:max-w-none">
              <QuadrantIllustration />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container py-16 md:py-20">
        <div className="mx-auto max-w-2xl space-y-3 text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">{t('stepsTitle')}</h2>
          <p className="text-muted-foreground">{t('stepsSubtitle')}</p>
        </div>

        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full border-border/70 bg-card/60">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                      <step.icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </div>
                  <CardTitle className="pt-2">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">{step.body}</CardDescription>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* Trust */}
      <section className="border-t border-border/70 bg-secondary/30">
        <div className="container py-16 md:py-20">
          <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">
            {t('trustTitle')}
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {trust.map((item) => (
              <Card key={item.title} className="border-border/70 bg-card/60">
                <CardHeader>
                  <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <item.icon className="size-5" aria-hidden="true" />
                  </span>
                  <CardTitle className="pt-2 text-base">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">{item.body}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

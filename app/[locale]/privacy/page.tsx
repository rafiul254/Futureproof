import { ShieldCheck } from 'lucide-react';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('privacy');

  const sections = [
    { title: t('scrubTitle'), body: t('scrubBody') },
    { title: t('leavesTitle'), body: t('leavesBody') },
    { title: t('storageTitle'), body: t('storageBody') },
    { title: t('controlTitle'), body: t('controlBody') },
    { title: t('auditTitle'), body: t('auditBody') },
  ];

  return (
    <div className="container max-w-3xl space-y-8 py-12 md:py-16">
      <div className="space-y-3">
        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </span>
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <Card key={section.title} className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">{section.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="leading-relaxed">{section.body}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        <Link href="/settings" className="text-accent underline-offset-4 hover:underline">
          Settings
        </Link>
        {' · '}
        <Link href="/methodology" className="text-accent underline-offset-4 hover:underline">
          Methodology
        </Link>
      </p>
    </div>
  );
}

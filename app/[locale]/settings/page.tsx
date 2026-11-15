import { getTranslations, setRequestLocale } from 'next-intl/server';

import { SettingsPanel } from '@/components/settings/settings-panel';

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('settings');

  return (
    <div className="container max-w-2xl space-y-8 py-12 md:py-16">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <SettingsPanel />
    </div>
  );
}

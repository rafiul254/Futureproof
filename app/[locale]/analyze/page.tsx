import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { getTranslations, setRequestLocale } from 'next-intl/server';

import { AnalyzeForm, type SampleOption } from '@/components/analyze/analyze-form';
import { getDataProvider, type Occupation } from '@/lib/data';
import { isLlmConfigured } from '@/lib/env';

export default async function AnalyzePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('analyze');

  const provider = await getDataProvider();
  const occupations = (await provider.listOccupations()) as Occupation[];

  const samples = JSON.parse(
    await readFile(path.join(process.cwd(), 'data', 'seed', 'sample_profiles.json'), 'utf8'),
  ) as SampleOption[];

  return (
    <div className="container max-w-2xl py-12 md:py-16">
      <div className="mb-8 space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <AnalyzeForm
        occupations={occupations.map((o) => ({ id: o.id, title: o.title, titleBn: o.titleBn }))}
        samples={samples.map((s) => ({
          key: s.key,
          title: s.title,
          titleBn: s.titleBn,
          summary: s.summary,
          summaryBn: s.summaryBn,
        }))}
        offline={!isLlmConfigured()}
      />
    </div>
  );
}

import { Construction } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';

/**
 * Placeholder for screens that are scaffolded now and implemented in a later phase.
 * Honest by design: never pretends the feature exists.
 */
export function ComingSoon({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: string;
}) {
  const t = useTranslations('placeholder');

  return (
    <div className="container flex min-h-[60vh] max-w-2xl flex-col justify-center py-16">
      <Card className="border-dashed">
        <CardHeader>
          <span className="mb-2 flex size-10 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
            <Construction className="size-5" aria-hidden="true" />
          </span>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="leading-relaxed">{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('comingInPhase', { phase })}</p>
          <Link
            href="/"
            className="inline-block text-sm font-medium text-accent underline-offset-4 hover:underline"
          >
            {t('backHome')}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

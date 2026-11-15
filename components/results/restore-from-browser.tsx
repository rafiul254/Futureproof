'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { recallResult } from '@/lib/client-results';

/**
 * Shown instead of a 404 when the server has no record of this analysis (for example a
 * serverless instance that never saw it). If this browser still holds the result, it is
 * handed back to the server once and the page reloads; otherwise the user is told plainly.
 */
export function RestoreFromBrowser({ id }: { id: string }) {
  const t = useTranslations('results');
  const tErrors = useTranslations('errors');
  const router = useRouter();
  const [state, setState] = useState<'checking' | 'missing'>('checking');

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      const result = recallResult(id);
      if (!result) return setState('missing');
      try {
        const response = await fetch('/api/analysis/restore', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id, result }),
        });
        if (!response.ok) return !cancelled && setState('missing');
        if (!cancelled) router.refresh();
      } catch {
        if (!cancelled) setState('missing');
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  if (state === 'checking') {
    return (
      <div
        className="container flex min-h-[50vh] items-center justify-center gap-3 text-muted-foreground"
        role="status"
      >
        <Loader2 className="size-5 animate-spin" aria-hidden="true" />
        {t('restoring')}
      </div>
    );
  }
  return (
    <div className="container flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center">
      <p className="max-w-md text-muted-foreground">{tErrors('notFound')}</p>
      <Button asChild>
        <Link href="/analyze">{t('newAnalysis')}</Link>
      </Button>
    </div>
  );
}

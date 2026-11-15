'use client';

import { useEffect } from 'react';

import { Link } from '@/i18n/navigation';

import { Button } from '@/components/ui/button';

/**
 * Shown when a page throws. Deliberately vague: a user-facing error must never
 * print a stack trace, a SQL error, or an internal id.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[page error]', error);
  }, [error]);

  return (
    <div className="container flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        Nothing was saved from this attempt. Your earlier results are still available.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
      ) : null}
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}

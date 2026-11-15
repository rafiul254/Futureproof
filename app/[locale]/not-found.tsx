import { FileQuestion } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';

/**
 * 404 for any locale route. It receives no params, so text is intentionally
 * bilingual instead of pulling a single locale's messages.
 */
export default function LocaleNotFound() {
  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
        <FileQuestion className="size-6" aria-hidden="true" />
      </span>
      <p className="text-4xl font-bold tracking-tight">404</p>
      <p className="max-w-sm text-muted-foreground">
        This page does not exist. / এই পৃষ্ঠাটি পাওয়া যায়নি।
      </p>
      <Button asChild variant="outline">
        <Link href="/">FutureProof</Link>
      </Button>
    </div>
  );
}

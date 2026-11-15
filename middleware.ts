import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';

/**
 * Phase 0: i18n routing only.
 * Phase 1+: Supabase session refresh will be composed here (see lib/supabase/middleware.ts).
 */
export default createMiddleware(routing);

export const config = {
  // Skip API routes, Next internals and any path with a file extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};

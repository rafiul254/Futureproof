import 'server-only';

/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Enough for a single-instance MVP and for blocking accidents and obvious abuse.
 * Before real scale, move this to Supabase or Upstash (see docs/ROADMAP.md) —
 * the call sites do not change.
 */

interface Bucket {
  hits: number[];
}

const globalForLimiter = globalThis as unknown as { __fpRateLimit?: Map<string, Bucket> };

function store(): Map<string, Bucket> {
  globalForLimiter.__fpRateLimit ??= new Map();
  return globalForLimiter.__fpRateLimit;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  options: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const buckets = store();
  const bucket = buckets.get(key) ?? { hits: [] };

  bucket.hits = bucket.hits.filter((timestamp) => now - timestamp < options.windowMs);

  if (bucket.hits.length >= options.limit) {
    const oldest = bucket.hits[0] ?? now;
    buckets.set(key, bucket);
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((options.windowMs - (now - oldest)) / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);

  return {
    allowed: true,
    remaining: options.limit - bucket.hits.length,
    retryAfterSeconds: 0,
  };
}

/** Best-effort client identity for rate limiting. */
export function clientKey(request: Request, userId: string | null): string {
  if (userId) return `user:${userId}`;
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'anonymous';
  return `ip:${ip}`;
}

export const RATE_LIMITS = {
  ingest: { limit: 10, windowMs: 60_000 },
  analyze: { limit: 8, windowMs: 60_000 },
  path: { limit: 10, windowMs: 60_000 },
  export: { limit: 5, windowMs: 60_000 },
  delete: { limit: 5, windowMs: 60_000 },
} as const;

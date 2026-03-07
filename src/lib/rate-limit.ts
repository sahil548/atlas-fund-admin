// ── In-memory rate limiter for AI endpoints ──────────────────────────────────

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

// Two separate stores: per-minute and per-hour
const minuteStore = new Map<string, BucketEntry>();
const hourStore = new Map<string, BucketEntry>();

const DEFAULT_MINUTE_CONFIG: RateLimitConfig = {
  maxRequests: 20,
  windowMs: 60 * 1000, // 1 minute
};

const DEFAULT_HOUR_CONFIG: RateLimitConfig = {
  maxRequests: 200,
  windowMs: 60 * 60 * 1000, // 1 hour
};

function checkBucket(
  store: Map<string, BucketEntry>,
  key: string,
  config: RateLimitConfig,
  now: number,
): { allowed: boolean; remaining: number; retryAfter?: number } {
  // GC: remove expired entries on every call
  for (const [k, entry] of store.entries()) {
    if (entry.resetAt <= now) store.delete(k);
  }

  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    // Start new window
    store.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }

  if (existing.count >= config.maxRequests) {
    const retryAfter = Math.ceil((existing.resetAt - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  existing.count += 1;
  return { allowed: true, remaining: config.maxRequests - existing.count };
}

/**
 * Check per-user rate limit.
 * Enforces both per-minute and per-hour limits.
 * Returns the most restrictive result.
 */
export function rateLimit(
  userId: string,
  minuteConfig: RateLimitConfig = DEFAULT_MINUTE_CONFIG,
  hourConfig: RateLimitConfig = DEFAULT_HOUR_CONFIG,
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();

  const minuteKey = `minute:${userId}`;
  const hourKey = `hour:${userId}`;

  const minuteResult = checkBucket(minuteStore, minuteKey, minuteConfig, now);
  const hourResult = checkBucket(hourStore, hourKey, hourConfig, now);

  if (!minuteResult.allowed) {
    return minuteResult;
  }
  if (!hourResult.allowed) {
    return hourResult;
  }

  return {
    allowed: true,
    remaining: Math.min(minuteResult.remaining, hourResult.remaining),
  };
}

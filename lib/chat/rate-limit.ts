/** Sliding-window limiter: at most `limit` hits per key within `windowMs`. */
export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const hits = new Map<string, number[]>();
  return {
    check(key: string, now = Date.now()): RateLimitResult {
      const recent = (hits.get(key) || []).filter((time) => now - time < windowMs);
      if (recent.length >= limit) {
        hits.set(key, recent);
        return { allowed: false, retryAfterMs: windowMs - (now - recent[0]) };
      }
      recent.push(now);
      hits.set(key, recent);
      return { allowed: true, retryAfterMs: 0 };
    },
    clear() {
      hits.clear();
    },
  };
}

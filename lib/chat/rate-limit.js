/** Sliding-window limiter: at most `limit` hits per key within `windowMs`. */
export function createRateLimiter({ limit, windowMs }) {
  const hits = new Map();
  return {
    check(key, now = Date.now()) {
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

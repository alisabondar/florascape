import { createHash } from "node:crypto";

const PLAN_CACHE_TTL_MS = 60 * 60 * 1000;

export function hashKey(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/** Small in-memory cache whose entries expire after ttlMs. */
export function createTtlCache(ttlMs) {
  const entries = new Map();
  return {
    get(key, now = Date.now()) {
      const entry = entries.get(key);
      if (!entry) {
        return null;
      }
      if (now - entry.storedAt >= ttlMs) {
        entries.delete(key);
        return null;
      }
      return entry.value;
    },
    set(key, value, now = Date.now()) {
      entries.set(key, { value, storedAt: now });
    },
    clear() {
      entries.clear();
    },
  };
}

const planCache = createTtlCache(PLAN_CACHE_TTL_MS);

export function planCacheKey(plannerInput) {
  return hashKey(plannerInput);
}

export function getCachedPlan(key, now = Date.now()) {
  return planCache.get(key, now);
}

export function setCachedPlan(key, value, now = Date.now()) {
  planCache.set(key, value, now);
}

export function clearPlanCache() {
  planCache.clear();
}

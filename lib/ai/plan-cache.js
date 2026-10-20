import { createHash } from "node:crypto";

const PLAN_CACHE_TTL_MS = 60 * 60 * 1000;
const planCache = new Map();

export function planCacheKey(plannerInput) {
  return createHash("sha256").update(JSON.stringify(plannerInput)).digest("hex");
}

export function getCachedPlan(key, now = Date.now()) {
  const entry = planCache.get(key);
  if (!entry) {
    return null;
  }
  if (now - entry.storedAt >= PLAN_CACHE_TTL_MS) {
    planCache.delete(key);
    return null;
  }
  return entry.value;
}

export function setCachedPlan(key, value, now = Date.now()) {
  planCache.set(key, { value, storedAt: now });
}

export function clearPlanCache() {
  planCache.clear();
}

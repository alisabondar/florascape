import { createHash } from "node:crypto";

import type { PlannerInput, PlanResponseBody } from "../types";

export interface TtlCache<V> {
  get(key: string, now?: number): V | null;
  set(key: string, value: V, now?: number): void;
  clear(): void;
}

const PLAN_CACHE_TTL_MS = 60 * 60 * 1000;

export function hashKey(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

/** Small in-memory cache whose entries expire after ttlMs. */
export function createTtlCache<V>(ttlMs: number): TtlCache<V> {
  const entries = new Map<string, { value: V; storedAt: number }>();
  return {
    get(key: string, now = Date.now()) {
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
    set(key: string, value: V, now = Date.now()) {
      entries.set(key, { value, storedAt: now });
    },
    clear() {
      entries.clear();
    },
  };
}

const planCache = createTtlCache<PlanResponseBody>(PLAN_CACHE_TTL_MS);

export function planCacheKey(plannerInput: PlannerInput): string {
  return hashKey(plannerInput);
}

export function getCachedPlan(key: string, now = Date.now()): PlanResponseBody | null {
  return planCache.get(key, now);
}

export function setCachedPlan(key: string, value: PlanResponseBody, now = Date.now()): void {
  planCache.set(key, value, now);
}

export function clearPlanCache() {
  planCache.clear();
}

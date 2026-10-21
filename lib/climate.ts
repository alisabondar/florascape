import type { ClimateContext, ForecastDay, ForecastSummary, FrostDates } from "./types";

/** The slice of fetch the climate lookups use, so tests can pass a minimal stub. */
export type FetchImpl = (
  url: string,
  init?: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "json">>;

/** Daily series from Open-Meteo; values can be null for missing readings. */
export interface DailySeries {
  time?: string[];
  temperature_2m_min?: (number | null)[];
  temperature_2m_max?: (number | null)[];
}

export interface HardinessZone {
  zone: string;
  temperatureRange: string | null;
  lat: number;
  lon: number;
}

interface FrostYear {
  lastSpring: number | null;
  firstFall: number | null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

const REQUEST_TIMEOUT_MS = 5000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FROST_THRESHOLD_C = 0;
const HISTORY_YEARS = 5;
// Day-of-year 182 is July 1 in a non-leap year; it splits spring frosts from fall frosts.
const MIDSUMMER_DAY = 182;
const REFERENCE_YEAR = 2001;

const climateCache = new Map<string, { value: ClimateContext; storedAt: number }>();

export function clearClimateCache(): void {
  climateCache.clear();
}

async function fetchJsonWithTimeout(
  url: string,
  fetchImpl: FetchImpl,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<unknown> {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }
  return response.json();
}

// Day-of-year normalized to a non-leap year so medians line up across years.
function dayOfYear(isoDate: string): number {
  const [, month, day] = isoDate.split("-").map(Number);
  return (Date.UTC(REFERENCE_YEAR, month - 1, day) - Date.UTC(REFERENCE_YEAR, 0, 1)) / 86400000;
}

function dayOfYearToMonthDay(doy: number): string {
  const date = new Date(Date.UTC(REFERENCE_YEAR, 0, 1) + Math.round(doy) * 86400000);
  return date.toISOString().slice(5, 10);
}

function median(values: number[]): number | null {
  if (!values.length) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Computes median frost dates from parallel arrays of ISO dates and daily minimum
 * temperatures (°C). Returns month-day strings ("04-28") so they read the same every year.
 */
export function computeFrostDates(
  dates: string[],
  minTemperatures: readonly unknown[],
): FrostDates {
  const byYear = new Map<string, FrostYear>();
  dates.forEach((date, index) => {
    const min = minTemperatures[index];
    if (typeof min !== "number" || min > FROST_THRESHOLD_C) {
      return;
    }
    const year = date.slice(0, 4);
    const doy = dayOfYear(date);
    const entry: FrostYear = byYear.get(year) || { lastSpring: null, firstFall: null };
    if (doy < MIDSUMMER_DAY) {
      entry.lastSpring = Math.max(entry.lastSpring ?? -1, doy);
    } else if (entry.firstFall === null || doy < entry.firstFall) {
      entry.firstFall = doy;
    }
    byYear.set(year, entry);
  });

  const years = [...new Set(dates.map((date) => date.slice(0, 4)))];
  const springDays = years.map((year) => byYear.get(year)?.lastSpring).filter((d): d is number => d != null);
  const fallDays = years.map((year) => byYear.get(year)?.firstFall).filter((d): d is number => d != null);
  const lastSpring = median(springDays);
  const firstFall = median(fallDays);

  return {
    lastSpringFrost: lastSpring === null ? null : dayOfYearToMonthDay(lastSpring),
    firstFallFrost: firstFall === null ? null : dayOfYearToMonthDay(firstFall),
    // With no frost on one side of the year, the season is effectively year-round.
    growingSeasonDays:
      lastSpring === null && firstFall === null
        ? 365
        : Math.round((firstFall ?? 365) - (lastSpring ?? 0)),
    yearsAnalyzed: years.length,
  };
}

export function summarizeForecast(daily: DailySeries | null | undefined): ForecastSummary {
  const dates = daily?.time || [];
  const mins = daily?.temperature_2m_min || [];
  const maxes = daily?.temperature_2m_max || [];
  // Missing readings pass through as-is; the frost filter below skips non-numbers.
  const days = dates.map((date, index): ForecastDay => ({
    date,
    minC: mins[index] as number,
    maxC: maxes[index] as number,
  }));
  const frostDays = days
    .filter((day) => typeof day.minC === "number" && day.minC <= FROST_THRESHOLD_C)
    .map((day) => day.date);
  return { days, frostDays, frostWarning: frostDays.length > 0 };
}

export async function fetchHardinessZone(zipCode: string, fetchImpl: FetchImpl = fetch): Promise<HardinessZone> {
  const data = asRecord(await fetchJsonWithTimeout(`https://phzmapi.org/${zipCode}.json`, fetchImpl));
  const coordinates = asRecord(data?.coordinates);
  const lat = Number(coordinates?.lat);
  const lon = Number(coordinates?.lon);
  if (!data?.zone || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error("Hardiness zone response was incomplete.");
  }
  return {
    zone: data.zone as string,
    temperatureRange: (data.temperature_range as string) || null,
    lat,
    lon,
  };
}

export async function fetchFrostDates(
  { lat, lon }: Pick<HardinessZone, "lat" | "lon">,
  now: Date,
  fetchImpl: FetchImpl = fetch,
): Promise<FrostDates> {
  const lastCompleteYear = now.getUTCFullYear() - 1;
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: `${lastCompleteYear - HISTORY_YEARS + 1}-01-01`,
    end_date: `${lastCompleteYear}-12-31`,
    daily: "temperature_2m_min",
    timezone: "auto",
  });
  const data = (await fetchJsonWithTimeout(
    `https://archive-api.open-meteo.com/v1/archive?${params}`,
    fetchImpl,
  )) as { daily?: DailySeries } | null;
  if (!Array.isArray(data?.daily?.time) || !Array.isArray(data?.daily?.temperature_2m_min)) {
    throw new Error("Historical temperature response was incomplete.");
  }
  return computeFrostDates(data.daily.time, data.daily.temperature_2m_min);
}

export async function fetchForecast(
  { lat, lon }: Pick<HardinessZone, "lat" | "lon">,
  fetchImpl: FetchImpl = fetch,
): Promise<ForecastSummary> {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    daily: "temperature_2m_max,temperature_2m_min",
    forecast_days: "7",
    timezone: "auto",
  });
  const data = (await fetchJsonWithTimeout(
    `https://api.open-meteo.com/v1/forecast?${params}`,
    fetchImpl,
  )) as { daily?: DailySeries } | null;
  if (!Array.isArray(data?.daily?.time)) {
    throw new Error("Forecast response was incomplete.");
  }
  return summarizeForecast(data.daily);
}

/**
 * Looks up zone, frost dates, and forecast for a ZIP. Every source is optional:
 * a failed source is omitted and the rest still return. Returns null when nothing resolved.
 */
export async function getClimateContext(
  zipCode: string,
  { fetchImpl = fetch, now = new Date() }: { fetchImpl?: FetchImpl; now?: Date } = {},
): Promise<ClimateContext | null> {
  const cached = climateCache.get(zipCode);
  if (cached && now.getTime() - cached.storedAt < CACHE_TTL_MS) {
    return cached.value;
  }

  let zone: HardinessZone;
  try {
    zone = await fetchHardinessZone(zipCode, fetchImpl);
  } catch (error) {
    console.warn("Hardiness zone lookup failed", { zipCode, reason: error instanceof Error ? error.message : undefined });
    return null;
  }

  const [frost, forecast] = await Promise.allSettled([
    fetchFrostDates(zone, now, fetchImpl),
    fetchForecast(zone, fetchImpl),
  ]);
  for (const [source, result] of [
    ["frost", frost],
    ["forecast", forecast],
  ] as const) {
    if (result.status === "rejected") {
      console.warn(`Climate ${source} lookup failed`, { zipCode, reason: (result.reason as Error | undefined)?.message });
    }
  }

  const value: ClimateContext = {
    hardinessZone: zone.zone,
    temperatureRange: zone.temperatureRange,
    frost: frost.status === "fulfilled" ? frost.value : null,
    forecast: forecast.status === "fulfilled" ? forecast.value : null,
  };
  climateCache.set(zipCode, { value, storedAt: now.getTime() });
  return value;
}

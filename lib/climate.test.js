import { beforeEach, describe, expect, test } from "bun:test";
import {
  clearClimateCache,
  computeFrostDates,
  getClimateContext,
  summarizeForecast,
} from "./climate";

function yearOfMins(year, frostDays) {
  const dates = [];
  const mins = [];
  for (let day = 0; day < 365; day += 1) {
    const date = new Date(Date.UTC(year, 0, 1) + day * 86400000).toISOString().slice(0, 10);
    dates.push(date);
    mins.push(frostDays.has(date.slice(5)) ? -2 : 8);
  }
  return { dates, mins };
}

function jsonResponse(body, ok = true) {
  return Promise.resolve({ ok, status: ok ? 200 : 503, json: () => Promise.resolve(body) });
}

describe("computeFrostDates", () => {
  test("takes the median last spring and first fall frost across years", () => {
    const years = [
      yearOfMins(2021, new Set(["04-20", "10-10"])),
      yearOfMins(2022, new Set(["04-25", "10-15"])),
      yearOfMins(2023, new Set(["04-30", "10-20"])),
    ];
    const result = computeFrostDates(
      years.flatMap((y) => y.dates),
      years.flatMap((y) => y.mins),
    );
    expect(result.lastSpringFrost).toBe("04-25");
    expect(result.firstFallFrost).toBe("10-15");
    expect(result.growingSeasonDays).toBe(173);
    expect(result.yearsAnalyzed).toBe(3);
  });

  test("treats 0 °C as frost and reports a year-round season without frost", () => {
    const frost = computeFrostDates(["2023-03-01", "2023-11-01"], [0, 0.1]);
    expect(frost.lastSpringFrost).toBe("03-01");
    expect(frost.firstFallFrost).toBeNull();

    const frostFree = computeFrostDates(["2023-01-01"], [12]);
    expect(frostFree.growingSeasonDays).toBe(365);
  });
});

describe("summarizeForecast", () => {
  test("flags forecast frost days", () => {
    const result = summarizeForecast({
      time: ["2026-10-20", "2026-10-21"],
      temperature_2m_min: [3, -1],
      temperature_2m_max: [14, 9],
    });
    expect(result.frostWarning).toBe(true);
    expect(result.frostDays).toEqual(["2026-10-21"]);
  });
});

describe("getClimateContext", () => {
  beforeEach(() => clearClimateCache());

  const zone = { zone: "6a", temperature_range: "-10 to -5", coordinates: { lat: "39.7", lon: "-104.9" } };

  test("keeps the zone when Open-Meteo sources fail", async () => {
    const fetchImpl = (url) =>
      url.includes("phzmapi") ? jsonResponse(zone) : jsonResponse({}, false);
    const result = await getClimateContext("80205", { fetchImpl });
    expect(result).toEqual({
      hardinessZone: "6a",
      temperatureRange: "-10 to -5",
      frost: null,
      forecast: null,
    });
  });

  test("returns null when the zone lookup fails", async () => {
    const fetchImpl = () => Promise.reject(new Error("network down"));
    expect(await getClimateContext("80205", { fetchImpl })).toBeNull();
  });

  test("caches lookups per ZIP", async () => {
    let calls = 0;
    const fetchImpl = (url) => {
      calls += 1;
      if (url.includes("phzmapi")) return jsonResponse(zone);
      if (url.includes("archive")) {
        return jsonResponse({ daily: { time: ["2025-04-01"], temperature_2m_min: [-1] } });
      }
      return jsonResponse({ daily: { time: ["2026-10-20"], temperature_2m_min: [5], temperature_2m_max: [15] } });
    };
    const first = await getClimateContext("80205", { fetchImpl });
    const second = await getClimateContext("80205", { fetchImpl });
    expect(second).toBe(first);
    expect(calls).toBe(3);
  });
});

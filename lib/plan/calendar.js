import { findPlantFacts } from "../plant-facts";
import { dayOfYear, plantingWindowDays } from "./fill";

const DAY_MS = 86400000;
const WINDOW_FALLBACK_DAYS = { now: 0, next_month: 30, next_season: 90 };

function startOfUtcDay(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_MS);
}

/**
 * First date on or after today to sow/plant. With frost dates, today if it's inside the
 * planting window, otherwise the next window start; without them, the guide's window.
 */
export function sowingDate(entry, climate, today = new Date()) {
  const base = startOfUtcDay(today);
  const fact = findPlantFacts(entry.plantName);
  const window = fact ? plantingWindowDays(fact, climate) : null;

  if (!window) {
    return addDays(base, WINDOW_FALLBACK_DAYS[entry.whenToPlant] ?? WINDOW_FALLBACK_DAYS.next_season);
  }

  const now = dayOfYear(base);
  if (now >= window.start && now <= window.end) {
    return base;
  }
  const untilStart = (((window.start - now) % 365) + 365) % 365;
  return addDays(base, untilStart);
}

/** One sowing event per guide plant, plus a harvest-window event when maturity is known. */
export function buildCalendarEvents(plantingGuide, climate, today = new Date()) {
  return (plantingGuide || [])
    .filter((entry) => entry.quantity > 0)
    .flatMap((entry) => {
      const fact = findPlantFacts(entry.plantName);
      const sow = sowingDate(entry, climate, today);
      const method = fact?.sowing === "transplant" ? "Plant starts" : "Sow";
      const events = [
        {
          id: `${entry.id}-sow`,
          date: sow,
          summary: `${method}: ${entry.plantName} (${entry.quantity})`,
          description: [entry.timingDetails, `Spacing: ${entry.spacingInches} in.`, entry.sowingAmount]
            .filter(Boolean)
            .join(" "),
        },
      ];
      if (fact?.daysToMaturity) {
        events.push({
          id: `${entry.id}-harvest`,
          date: addDays(sow, fact.daysToMaturity),
          summary: `Harvest window opens: ${entry.plantName}`,
          description: `About ${fact.daysToMaturity} days after planting. Check ripeness before harvesting.`,
        });
      }
      return events;
    });
}

function formatIcsDate(date) {
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function formatIcsTimestamp(date) {
  return `${date.toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`;
}

export function escapeIcsText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/[,;]/g, (character) => `\\${character}`);
}

const encoder = new TextEncoder();

// RFC 5545 §3.1: lines longer than 75 octets continue on the next line after a space.
// Counts UTF-8 bytes per character so multi-byte characters are never split.
function foldLine(line) {
  const parts = [];
  let current = "";
  let currentBytes = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    const limit = parts.length ? 74 : 75;
    if (currentBytes + bytes > limit) {
      parts.push(current);
      current = "";
      currentBytes = 0;
    }
    current += character;
    currentBytes += bytes;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function eventsToIcs(events, now = new Date()) {
  const stamp = formatIcsTimestamp(now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//FloraScape//Garden Plan//EN",
    "CALSCALE:GREGORIAN",
    ...events.flatMap((event) => [
      "BEGIN:VEVENT",
      `UID:${event.id}-${formatIcsDate(event.date)}@florascape`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${formatIcsDate(event.date)}`,
      `DTEND;VALUE=DATE:${formatIcsDate(addDays(event.date, 1))}`,
      `SUMMARY:${escapeIcsText(event.summary)}`,
      `DESCRIPTION:${escapeIcsText(event.description)}`,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ];
  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

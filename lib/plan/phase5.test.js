import { describe, expect, test } from "bun:test";
import { PLANT_FACTS } from "../plant-facts";
import companions from "../companions.json";
import { buildCalendarEvents, escapeIcsText, eventsToIcs, sowingDate } from "./calendar";
import { checkNeighbors } from "./neighbors";
import { plantShoppingItems, soilShoppingItems } from "./shopping";

const climate = {
  hardinessZone: "6a",
  frost: { lastSpringFrost: "04-25", firstFallFrost: "10-15", growingSeasonDays: 173 },
};
const entry = (plantName, extra = {}) => ({
  id: `guide-${plantName.toLowerCase()}`,
  plantName,
  quantity: 4,
  whenToPlant: "next_season",
  spacingInches: 12,
  timingDetails: "Details.",
  sowingAmount: "Sow 6, thin to 4.",
  ...extra,
});
const iso = (date) => date.toISOString().slice(0, 10);

describe("sowing dates", () => {
  test("uses today inside the window and the next window start outside it", () => {
    expect(iso(sowingDate(entry("Tomato"), climate, new Date("2026-06-01T12:00:00Z")))).toBe("2026-06-01");
    expect(iso(sowingDate(entry("Tomato"), climate, new Date("2026-10-20T12:00:00Z")))).toBe("2027-04-25");
    // Hardy peas can go in six weeks before the last spring frost.
    expect(iso(sowingDate(entry("Pea"), climate, new Date("2026-01-10T12:00:00Z")))).toBe("2026-03-14");
  });

  test("falls back to the guide window without frost dates and never dates the past", () => {
    const today = new Date("2026-10-20T12:00:00Z");
    expect(iso(sowingDate(entry("Mystery Plant", { whenToPlant: "next_month" }), null, today))).toBe("2026-11-19");
    expect(iso(sowingDate(entry("Tomato", { whenToPlant: "now" }), null, today))).toBe("2026-10-20");
    const events = buildCalendarEvents(
      PLANT_FACTS.map((fact) => entry(fact.name)),
      climate,
      today,
    );
    events.forEach((event) => expect(event.date.getTime()).toBeGreaterThanOrEqual(Date.UTC(2026, 9, 20)));
  });

  test("adds a harvest event only when days to maturity are known", () => {
    const events = buildCalendarEvents([entry("Radish"), entry("Mystery Plant")], climate, new Date("2026-05-01T12:00:00Z"));
    expect(events.map((event) => event.summary)).toEqual([
      "Sow: Radish (4)",
      "Harvest window opens: Radish",
      "Sow: Mystery Plant (4)",
    ]);
    expect(iso(events[1].date)).toBe("2026-05-29");
    const tomato = buildCalendarEvents([entry("Tomato")], climate, new Date("2026-05-01T12:00:00Z"));
    expect(tomato[0].summary).toBe("Plant starts: Tomato (4)");
  });
});

describe("ics output", () => {
  const events = buildCalendarEvents([entry("Radish"), entry("Basil")], climate, new Date("2026-05-01T12:00:00Z"));
  const ics = eventsToIcs(events, new Date("2026-05-01T09:30:00Z"));

  test("uses CRLF lines, a calendar header, and complete events", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
    const blocks = ics.split("BEGIN:VEVENT").slice(1);
    expect(blocks).toHaveLength(events.length);
    blocks.forEach((block) => {
      expect(block).toMatch(/\r\nUID:[^\r]+@florascape\r\n/);
      expect(block).toContain("DTSTAMP:20260501T093000Z");
      expect(block).toMatch(/DTSTART;VALUE=DATE:\d{8}\r\n/);
      expect(block).toContain("SUMMARY:");
    });
    const uids = ics.match(/UID:[^\r]+/g);
    expect(new Set(uids).size).toBe(uids.length);
  });

  test("escapes text and folds long lines at 75 octets", () => {
    expect(escapeIcsText("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    const long = eventsToIcs(
      [{ id: "x", date: new Date("2026-05-01T00:00:00Z"), summary: "S", description: "é".repeat(100) }],
      new Date("2026-05-01T00:00:00Z"),
    );
    long.split("\r\n").forEach((line) => expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75));
    expect(long).toContain("\r\n é");
  });
});

describe("shopping list", () => {
  test("adds a germination buffer for seeds and buys starts for transplants", () => {
    const items = plantShoppingItems([
      { name: "Radish", quantity: 10 },
      { name: "Radishes", quantity: 6 },
      { name: "Tomato", quantity: 3 },
      { name: "Mystery Plant", quantity: 2 },
    ]);
    expect(items).toEqual([
      { name: "Radish", targetQuantity: 16, kind: "seeds", amount: 24 },
      { name: "Tomato", targetQuantity: 3, kind: "starts", amount: 3 },
      { name: "Mystery Plant", targetQuantity: 2, kind: "seeds", amount: 3 },
    ]);
  });

  test("every plant-facts entry records direct sowing or transplanting", () => {
    PLANT_FACTS.forEach((fact) => expect(["direct", "transplant"]).toContain(fact.sowing));
  });

  test("computes soil mix for beds and compost top-dressing in-ground", () => {
    const beds = soilShoppingItems({
      garden: { gardenTypeKey: "raised_beds" },
      beds: [
        { id: "a", name: "Bed 1", width: 8, height: 4, shape: "rect" },
        { id: "b", name: "Bed 2", width: 3, height: 3, shape: "rect" },
      ],
    });
    expect(beds.areas[0]).toMatchObject({ squareFeet: 32, soilMixCubicFeet: 32, compostCubicFeet: 10.7 });
    expect(beds.totals).toEqual({ soilMixCubicFeet: 41, compostCubicFeet: 13.7, bags: 28 });

    const ground = soilShoppingItems({
      garden: { gardenTypeKey: "in_ground" },
      beds: [{ id: "s", name: "Plot", width: 10, height: 6, shape: "rect" }],
    });
    expect(ground.areas[0]).toMatchObject({ soilMixCubicFeet: 0, compostCubicFeet: 10 });
    expect(ground.totals.bags).toBe(7);
  });
});

describe("neighbor check", () => {
  test("finds helpful pairs and conflicts within each area only", () => {
    const result = checkNeighbors({
      beds: [
        { id: "a", name: "Bed 1" },
        { id: "b", name: "Bed 2" },
      ],
      plants: [
        { name: "Tomatoes", bedId: "a" },
        { name: "Sweet Basil", bedId: "a" },
        { name: "Kale", bedId: "a" },
        { name: "Bush Bean", bedId: "b" },
        { name: "Garlic", bedId: "b" },
        { name: "Mint", bedId: "b" },
      ],
    });
    const bed1 = result.find((area) => area.bedId === "a");
    const bed2 = result.find((area) => area.bedId === "b");
    expect(bed1.helpful.map((item) => item.plants)).toEqual([["Tomatoes", "Sweet Basil"]]);
    expect(bed1.conflicts.map((item) => item.plants)).toEqual([["Tomatoes", "Kale"]]);
    expect(bed2.conflicts.map((item) => item.plants)).toEqual([["Bush Bean", "Garlic"], ["Mint"]]);
  });

  test("every companion rule has a type and reason", () => {
    companions.pairs.forEach((pair) => {
      expect(["helpful", "conflict"]).toContain(pair.type);
      expect(pair.reason.length).toBeGreaterThan(10);
    });
  });
});

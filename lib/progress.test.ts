import { describe, expect, test } from "bun:test";
import { award, DAILY_CHAT_XP_LIMIT, EMPTY_PROGRESS, levelFor, parseProgress } from "./progress";

describe("levels", () => {
  test("maps XP to a level, title, and progress toward the next", () => {
    expect(levelFor(0)).toMatchObject({ level: 1, title: "Seed Saver", xpToNext: 100 });
    expect(levelFor(175)).toMatchObject({ level: 2, title: "Sprout", progress: 0.5 });
    expect(levelFor(5000)).toMatchObject({ level: 10, title: "Master Gardener", progress: 1, next: null });
  });
});

describe("awarding XP", () => {
  test("each event key pays once", () => {
    const first = award(EMPTY_PROGRESS, { kind: "stamp-planted", key: "stamp:planted:p1:tomato" });
    expect(first.xpGained).toBe(20);
    const again = award(first.state, { kind: "stamp-planted", key: "stamp:planted:p1:tomato" });
    expect(again.xpGained).toBe(0);
    expect(again.state).toBe(first.state);
  });

  test("reports level-ups and new badges", () => {
    const plan = award(EMPTY_PROGRESS, { kind: "plan-created", key: "plan:1", detail: { plantKinds: 6 } });
    expect(plan.newBadges.map((badge) => badge.id).sort()).toEqual(["first-plan", "variety-pack"]);
    const harvest = award(plan.state, { kind: "stamp-harvested", key: "h:1", detail: { allHarvested: true } });
    expect(harvest.state.xp).toBe(90);
    const levelUp = award(harvest.state, { kind: "stamp-planted", key: "p:1" });
    expect(levelUp.leveledUp).toBe(true);
    expect(harvest.newBadges.map((badge) => badge.id).sort()).toEqual(["first-harvest", "full-set"]);
  });

  test("chat questions earn XP only up to the daily limit", () => {
    let state = EMPTY_PROGRESS;
    const now = new Date("2026-10-27T12:00:00Z");
    const gains: number[] = [];
    for (let index = 0; index < DAILY_CHAT_XP_LIMIT + 2; index += 1) {
      const result = award(state, { kind: "chat-question", key: `chat:${index}` }, now);
      gains.push(result.xpGained);
      state = result.state;
    }
    expect(gains).toEqual([5, 5, 5, 5, 5, 0, 0]);
    const tomorrow = award(state, { kind: "chat-question", key: "chat:next" }, new Date("2026-10-28T12:00:00Z"));
    expect(tomorrow.xpGained).toBe(5);
  });

  test("count-based badges unlock at their thresholds", () => {
    let state = EMPTY_PROGRESS;
    for (let index = 0; index < 10; index += 1) {
      state = award(state, { kind: "quest-done", key: `q:${index}` }).state;
    }
    expect(state.badges).toContain("quest-runner");
  });
});

describe("saved progress", () => {
  test("bad or partial data falls back safely", () => {
    expect(parseProgress(null)).toEqual(EMPTY_PROGRESS);
    expect(parseProgress({ xp: -5, claimed: ["a", 3], badges: "x" })).toMatchObject({ xp: 0, claimed: ["a"], badges: [] });
  });
});

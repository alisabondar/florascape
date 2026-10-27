/**
 * Gardener progression: XP, levels, and badges, kept on this device.
 *
 * Every reward is tied to a unique event key (e.g. "stamp:planted:<plan>:<plant>"), and a
 * key can only pay out once, so toggling a stamp or re-saving a season can't farm XP.
 */

export type ProgressEventKind =
  | "plan-created"
  | "stamp-planted"
  | "stamp-growing"
  | "stamp-harvested"
  | "quest-done"
  | "season-saved"
  | "rotation-kept"
  | "chat-question";

export const XP_REWARDS: Record<ProgressEventKind, number> = {
  "plan-created": 50,
  "stamp-planted": 20,
  "stamp-growing": 10,
  "stamp-harvested": 40,
  "quest-done": 15,
  "season-saved": 40,
  "rotation-kept": 60,
  "chat-question": 5,
};

/** Chat questions only earn XP for the first few each day. */
export const DAILY_CHAT_XP_LIMIT = 5;

export const LEVELS = [
  { level: 1, xp: 0, title: "Seed Saver" },
  { level: 2, xp: 100, title: "Sprout" },
  { level: 3, xp: 250, title: "Seedling Sitter" },
  { level: 4, xp: 450, title: "Backyard Grower" },
  { level: 5, xp: 700, title: "Bed Builder" },
  { level: 6, xp: 1000, title: "Green Thumb" },
  { level: 7, xp: 1400, title: "Harvest Keeper" },
  { level: 8, xp: 1900, title: "Compost Captain" },
  { level: 9, xp: 2500, title: "Orchard Hand" },
  { level: 10, xp: 3200, title: "Master Gardener" },
] as const;

export interface Badge {
  id: string;
  title: string;
  description: string;
}

export const BADGES: readonly Badge[] = [
  { id: "first-plan", title: "First Page", description: "Made your first garden plan." },
  { id: "first-sprout", title: "First Sprout", description: "Stamped your first plant as planted." },
  { id: "first-harvest", title: "First Harvest", description: "Stamped your first harvest." },
  { id: "full-set", title: "Full Set", description: "Harvested every card in one album." },
  { id: "quest-runner", title: "Quest Runner", description: "Finished 10 planting quests." },
  { id: "crop-rotator", title: "Crop Rotator", description: "Saved a season with no crop family repeats." },
  { id: "four-seasons", title: "Four Seasons", description: "Saved four seasons." },
  { id: "curious", title: "Curious Gardener", description: "Asked the garden helper 10 questions." },
  { id: "variety-pack", title: "Variety Pack", description: "Planned a garden with 6 or more kinds of plants." },
];

export interface ProgressState {
  xp: number;
  /** Event keys that have already paid out. */
  claimed: string[];
  badges: string[];
  counts: { quests: number; seasons: number; chats: number; chatsToday: number; chatDay: string };
}

export const EMPTY_PROGRESS: ProgressState = {
  xp: 0,
  claimed: [],
  badges: [],
  counts: { quests: 0, seasons: 0, chats: 0, chatsToday: 0, chatDay: "" },
};

export interface ProgressEvent {
  kind: ProgressEventKind;
  /** Unique per action; repeats pay nothing. */
  key: string;
  /** Extra facts some badges need. */
  detail?: { plantKinds?: number; allHarvested?: boolean };
}

export interface AwardResult {
  state: ProgressState;
  xpGained: number;
  leveledUp: boolean;
  newBadges: Badge[];
}

export function levelFor(xp: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const entry of LEVELS) {
    if (xp >= entry.xp) {
      current = entry;
    }
  }
  const next = LEVELS.find((entry) => entry.xp > xp) ?? null;
  const span = next ? next.xp - current.xp : 1;
  return {
    ...current,
    next,
    /** 0–1 progress toward the next level (1 at max level). */
    progress: next ? (xp - current.xp) / span : 1,
    xpToNext: next ? next.xp - xp : 0,
  };
}

function today(now: Date) {
  return now.toISOString().slice(0, 10);
}

/** Applies one event and returns the new state plus what changed. Pure. */
export function award(state: ProgressState, event: ProgressEvent, now = new Date()): AwardResult {
  const unchanged: AwardResult = { state, xpGained: 0, leveledUp: false, newBadges: [] };
  if (state.claimed.includes(event.key)) {
    return unchanged;
  }

  const counts = { ...state.counts };
  let xpGained = XP_REWARDS[event.kind];
  if (event.kind === "chat-question") {
    if (counts.chatDay !== today(now)) {
      counts.chatDay = today(now);
      counts.chatsToday = 0;
    }
    counts.chatsToday += 1;
    counts.chats += 1;
    if (counts.chatsToday > DAILY_CHAT_XP_LIMIT) {
      xpGained = 0;
    }
  }
  if (event.kind === "quest-done") counts.quests += 1;
  if (event.kind === "season-saved") counts.seasons += 1;

  const earned = new Set(state.badges);
  const gain = (id: string) => earned.add(id);
  if (event.kind === "plan-created") gain("first-plan");
  if (event.kind === "plan-created" && (event.detail?.plantKinds ?? 0) >= 6) gain("variety-pack");
  if (event.kind === "stamp-planted") gain("first-sprout");
  if (event.kind === "stamp-harvested") gain("first-harvest");
  if (event.kind === "stamp-harvested" && event.detail?.allHarvested) gain("full-set");
  if (event.kind === "rotation-kept") gain("crop-rotator");
  if (counts.quests >= 10) gain("quest-runner");
  if (counts.seasons >= 4) gain("four-seasons");
  if (counts.chats >= 10) gain("curious");

  const newBadges = BADGES.filter((badge) => earned.has(badge.id) && !state.badges.includes(badge.id));
  const xp = state.xp + xpGained;
  return {
    state: { xp, claimed: [...state.claimed, event.key], badges: [...earned], counts },
    xpGained,
    leveledUp: levelFor(xp).level > levelFor(state.xp).level,
    newBadges,
  };
}

/** Accepts only well-formed saved progress; anything else starts fresh. */
export function parseProgress(value: unknown): ProgressState {
  if (!value || typeof value !== "object") {
    return EMPTY_PROGRESS;
  }
  const raw = value as Partial<ProgressState>;
  const counts = (raw.counts ?? {}) as Partial<ProgressState["counts"]>;
  const number = (input: unknown) => (typeof input === "number" && Number.isFinite(input) && input >= 0 ? input : 0);
  const strings = (input: unknown) => (Array.isArray(input) ? input.filter((item): item is string => typeof item === "string") : []);
  return {
    xp: number(raw.xp),
    claimed: strings(raw.claimed),
    badges: strings(raw.badges),
    counts: {
      quests: number(counts.quests),
      seasons: number(counts.seasons),
      chats: number(counts.chats),
      chatsToday: number(counts.chatsToday),
      chatDay: typeof counts.chatDay === "string" ? counts.chatDay : "",
    },
  };
}

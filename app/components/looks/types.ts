import type { ClimateContext, GardenPlan, Plant, PlannerInput } from "../../../lib/types";

export const RESULT_LOOKS = [
  { id: "classic", label: "Classic" },
  { id: "quests", label: "Packet Quests" },
  { id: "album", label: "Collector's Album" },
  { id: "quest-binder", label: "Quest Binder" },
  { id: "seed-rack", label: "Seed Rack" },
] as const;

export type ResultLookId = (typeof RESULT_LOOKS)[number]["id"];

export function isResultLook(value: string | null): value is ResultLookId {
  return RESULT_LOOKS.some((look) => look.id === value);
}

/**
 * What every look's dashboard receives. Dashboards replace the top of the results page
 * (hero, actions, climate); the sections below stay shared and are themed by CSS.
 */
export interface LookDashboardProps {
  plan: GardenPlan;
  climate: ClimateContext | null;
  plannerInput: PlannerInput | undefined;
  /** "AI plan · Gemini", "Starter plan", or "Saved result". */
  sourceLabel: string;
  /** Shown when the plan fell back to the starter plan, etc. */
  warning: string;
  /** One-line summary of the inputs, e.g. "80205 · 2 raised beds · 8×4, 6×3 ft". */
  inputSummary: string;
  editHref: string;
  canShuffle: boolean;
  onShuffle: () => void;
  onCalendar: () => void;
  onPrint: () => void;
  onSwapPlant: (plantId: string, plantName: string) => void;
  /** Scrolls to the plant's planting-guide card. */
  onOpenGuide: (plant: Plant) => void;
}

import type { ClimateContext, GardenPlan, Layout, Plant, PlannerInput } from "../../../lib/types";

/**
 * What the Collector's Album dashboard receives. It replaces the top of the results page
 * and holds the bed editor; the sections below (guide, tips, shopping, …) stay shared.
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
  onSwapZones: (firstId: string, secondId: string) => void;
  onLayoutChange: (layout: Layout) => void;
  /** Scrolls to the plant's planting-guide card. */
  onOpenGuide: (plant: Plant) => void;
}

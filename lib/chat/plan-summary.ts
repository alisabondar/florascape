import type { GardenPlan } from "../types";

export interface ChatPlanSummary {
  gardenType: string;
  areas: {
    id: string;
    name: string;
    sun: string;
    sizeFt: string;
    plants: { id: string; name: string; quantity: number; spacingInches: number }[];
    alternatives: string[];
  }[];
}

/** Compact, AI-friendly view of the current plan: areas, their plants, and their alternatives. */
export function chatPlanSummary(plan: GardenPlan | null | undefined): ChatPlanSummary | null {
  const layout = plan?.layout;
  if (!plan || !layout?.beds?.length) {
    return null;
  }
  return {
    gardenType: layout.garden?.gardenType || "",
    areas: layout.beds.map((bed) => ({
      id: bed.id,
      name: bed.name,
      sun: bed.sunExposure || layout.garden?.sunExposure || "",
      sizeFt: `${bed.width} x ${bed.height}`,
      plants: layout.plants
        .filter((plant) => plant.bedId === bed.id)
        .map((plant) => ({
          id: plant.id,
          name: plant.name,
          quantity: plant.quantity,
          spacingInches: plant.spacingInches,
        })),
      alternatives: (plan.alternatives?.[bed.id] || []).map((item) => item.name),
    })),
  };
}

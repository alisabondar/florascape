import { layoutToSvgModel } from "../garden-layout";
import type { Layout, PlantingWindow } from "../types";

export interface LayoutTableRow {
  id: string;
  area: string;
  plant: string;
  quantity: number;
  spacingInches: number;
  size: string;
}

const TIMING_GROUPS: { key: PlantingWindow; title: string }[] = [
  { key: "now", title: "Plant now" },
  { key: "next_month", title: "Plant next month" },
  { key: "next_season", title: "Plant later" },
];

/** Groups visible guide entries by planting window, in now → next month → later order. */
export function groupGuideByTiming<T extends { whenToPlant: string; quantity: number }>(
  guide: T[] | null | undefined,
): { key: PlantingWindow; title: string; items: T[]; plantCount: number }[] {
  const visible = (guide || []).filter((item) => item.quantity > 0);
  return TIMING_GROUPS.map((group) => {
    const items = visible.filter((item) =>
      group.key === "next_season"
        ? !["now", "next_month"].includes(item.whenToPlant)
        : item.whenToPlant === group.key,
    );
    return {
      ...group,
      items,
      plantCount: items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    };
  }).filter((group) => group.items.length);
}

const roundToQuarter = (value: number): number => Math.max(0.25, Math.round(value * 4) / 4);

/** One row per plant group, using the same zones the sketch draws. */
export function layoutTableRows(layout: Layout): LayoutTableRow[] {
  const model = layoutToSvgModel(layout);
  const beds = new Map(layout.beds.map((bed) => [bed.id, bed]));
  const plants = new Map(layout.plants.map((plant) => [plant.id, plant]));
  return model.plantPatches
    .map((patch): LayoutTableRow | null => {
      const plant = plants.get(patch.plantId);
      if (!plant) {
        return null;
      }
      return {
        id: plant.id,
        area: beds.get(plant.bedId)?.name || "Growing area",
        plant: plant.name,
        quantity: Number(plant.quantity) || 1,
        spacingInches: plant.spacingInches,
        size: `${roundToQuarter(patch.width)} × ${roundToQuarter(patch.height)} ft`,
      };
    })
    .filter((row): row is LayoutTableRow => row !== null);
}

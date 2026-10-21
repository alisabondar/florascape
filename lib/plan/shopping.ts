import { findPlantFacts } from "../plant-facts";
import type { Layout, Plant } from "../types";

export interface PlantShoppingItem {
  name: string;
  targetQuantity: number;
  kind: "starts" | "seeds";
  amount: number;
}

export interface SoilArea {
  id: string;
  name: string;
  squareFeet: number;
  soilMixCubicFeet: number;
  compostCubicFeet: number;
}

export interface SoilShopping {
  inGround: boolean;
  areas: SoilArea[];
  totals: { soilMixCubicFeet: number; compostCubicFeet: number; bags: number };
}

export interface ShoppingList {
  plants: PlantShoppingItem[];
  soil: SoilShopping;
}

export const SHOPPING_ASSUMPTIONS = {
  germinationBuffer: 0.5,
  raisedBedDepthFt: 1,
  compostShare: 1 / 3,
  topDressingInches: 2,
  bagCubicFeet: 1.5,
};

const round1 = (value: number): number => Math.round(value * 10) / 10;

function sameName(left: unknown, right: unknown): boolean {
  const canonical = (name: unknown) => (findPlantFacts(name)?.name || String(name || "")).trim().toLowerCase();
  return canonical(left) === canonical(right);
}

/**
 * Seeds to sow (target plus a germination buffer) for direct-sown plants, or nursery
 * starts to buy for transplanted ones. Plants missing from plant facts count as seeds.
 */
export function plantShoppingItems(plants: Pick<Plant, "name" | "quantity">[]): PlantShoppingItem[] {
  const names: string[] = [];
  plants.forEach((plant) => {
    if (!names.some((name) => sameName(name, plant.name))) {
      names.push(plant.name);
    }
  });

  return names.map((name) => {
    const quantity = plants
      .filter((plant) => sameName(plant.name, name))
      .reduce((sum, plant) => sum + (Number(plant.quantity) || 1), 0);
    const transplant = findPlantFacts(name)?.sowing === "transplant";
    return {
      name,
      targetQuantity: quantity,
      kind: transplant ? "starts" : "seeds",
      amount: transplant
        ? quantity
        : Math.ceil(quantity * (1 + SHOPPING_ASSUMPTIONS.germinationBuffer)),
    };
  });
}

/** Soil mix for raised beds and containers (area × 1 ft); compost top-dressing in-ground. */
export function soilShoppingItems(layout: Pick<Layout, "garden" | "beds">): SoilShopping {
  const inGround = layout.garden?.gardenTypeKey === "in_ground";
  const { raisedBedDepthFt, compostShare, topDressingInches, bagCubicFeet } = SHOPPING_ASSUMPTIONS;

  const areas = layout.beds.map((bed): SoilArea => {
    const squareFeet = bed.shape === "circle"
      ? Math.PI * (Math.min(bed.width, bed.height) / 2) ** 2
      : bed.width * bed.height;
    if (inGround) {
      const compostCubicFeet = squareFeet * (topDressingInches / 12);
      return { id: bed.id, name: bed.name, squareFeet: round1(squareFeet), soilMixCubicFeet: 0, compostCubicFeet: round1(compostCubicFeet) };
    }
    const soilMixCubicFeet = squareFeet * raisedBedDepthFt;
    return {
      id: bed.id,
      name: bed.name,
      squareFeet: round1(squareFeet),
      soilMixCubicFeet: round1(soilMixCubicFeet),
      compostCubicFeet: round1(soilMixCubicFeet * compostShare),
    };
  });

  const soilMixCubicFeet = round1(areas.reduce((sum, area) => sum + area.soilMixCubicFeet, 0));
  const compostCubicFeet = round1(areas.reduce((sum, area) => sum + area.compostCubicFeet, 0));
  return {
    inGround,
    areas,
    totals: {
      soilMixCubicFeet,
      compostCubicFeet,
      // Compost is part of the soil mix for beds, so bags cover the full mix there.
      bags: Math.ceil((inGround ? compostCubicFeet : soilMixCubicFeet) / bagCubicFeet),
    },
  };
}

export function buildShoppingList(layout: Layout): ShoppingList {
  return { plants: plantShoppingItems(layout.plants), soil: soilShoppingItems(layout) };
}

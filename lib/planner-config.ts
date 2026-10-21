import type { AreaSunExposure, GardenType, PlantTypeKey } from "./types";

export interface AreaCopy {
  idPrefix: string;
  formLabel: string;
  drawingLabel: string;
  singular: string;
  plural: string;
}

export const GARDEN_TYPE_OPTIONS: { value: GardenType; label: string }[] = [
  { value: "any", label: "Any — recommend the best setup" },
  { value: "in_ground", label: "In-ground" },
  { value: "raised_beds", label: "Raised beds" },
  { value: "containers", label: "Containers" },
];

export const SUN_EXPOSURE_OPTIONS: { value: AreaSunExposure; label: string }[] = [
  { value: "full_sun", label: "Full sun (6+ hours)" },
  { value: "partial_shade", label: "Partial shade (3–6 hours)" },
  { value: "mostly_shade", label: "Mostly shade (under 3 hours)" },
];

const GARDEN_TYPE_VALUES = new Set<string>(GARDEN_TYPE_OPTIONS.map(({ value }) => value));
const REPEATABLE_GARDEN_TYPES = new Set<string>(["any", "raised_beds", "containers"]);
const AREA_COPY: Record<string, AreaCopy> = {
  any: {
    idPrefix: "area",
    formLabel: "Available area",
    drawingLabel: "Available area",
    singular: "available area",
    plural: "available areas",
  },
  raised_beds: {
    idPrefix: "bed",
    formLabel: "Raised bed",
    drawingLabel: "Bed",
    singular: "raised bed",
    plural: "raised beds",
  },
  containers: {
    idPrefix: "container",
    formLabel: "Container",
    drawingLabel: "Container",
    singular: "container",
    plural: "containers",
  },
};

export function isGardenType(value: unknown): value is GardenType {
  return typeof value === "string" && GARDEN_TYPE_VALUES.has(value);
}

export function isRepeatableGardenType(value: string): boolean {
  return REPEATABLE_GARDEN_TYPES.has(value);
}

export function getGardenTypeLabel(value: string): string {
  return GARDEN_TYPE_OPTIONS.find((option) => option.value === value)?.label || value;
}

export function getSunExposureLabel(value: string): string {
  return SUN_EXPOSURE_OPTIONS.find((option) => option.value === value)?.label || value;
}

export function getAreaCopy(gardenType: string): AreaCopy {
  return AREA_COPY[gardenType] || AREA_COPY.raised_beds;
}

export function getAreaId(gardenType: string, index: number): string {
  return `${getAreaCopy(gardenType).idPrefix}-${index + 1}`;
}

export function getAreaName(gardenType: string, index: number): string {
  return `${getAreaCopy(gardenType).drawingLabel} ${index + 1}`;
}

export function getGardenMethodLabel(value: string): string {
  if (value === "in_ground") {
    return "In-ground garden";
  }
  if (value === "containers") {
    return "Container garden";
  }
  return "Raised beds";
}

// Plant category keys submitted by the planner; "basic" is the Easy-Care Plants option.
export const PLANT_TYPE_KEYS: PlantTypeKey[] = ["flowers", "vegetables", "herbs", "medicinal", "basic"];
export const PREFERENCES_MAX_LENGTH = 500;
export const MAX_PLANT_QUANTITY = 999;

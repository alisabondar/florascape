import type { z } from "zod";
import type { chatResponse, gardenPlanResponse } from "./schemas/responses";

// ---------- Planner input ----------

export type GardenType = "any" | "in_ground" | "raised_beds" | "containers";
export type RecommendedGardenType = Exclude<GardenType, "any">;
export type AreaSunExposure = "full_sun" | "partial_shade" | "mostly_shade";
export type PlantSunNeeds = "full_sun" | "partial_shade" | "shade";
export type SunniestSide = "north" | "east" | "south" | "west" | "fully_shaded";
export type PlantTypeKey = "flowers" | "vegetables" | "herbs" | "medicinal" | "basic";

export interface InGroundInput {
  width: number;
  length: number;
  sunniestSide: string;
  plotStyle: "single" | "sections";
  sectionCount: number;
}

export interface GrowingUnitInput {
  id: string;
  name: string;
  width: number;
  length: number;
  sunExposure: AreaSunExposure;
  sunExposureLabel: string;
}

/** Normalized planner input, as produced by normalizePlannerInput. */
export interface PlannerInput {
  zipCode: string;
  gardenType: GardenType;
  gardenTypeLabel: string;
  plantTypes: string[];
  selectedPlants: string[];
  preferences: string;
  inGround: InGroundInput | null;
  units: GrowingUnitInput[];
}

// ---------- Layout ----------

export interface Garden {
  width: number;
  height: number;
  sunExposure: string;
  gardenType: string;
  gardenTypeKey: string;
  sunniestSide: string;
}

/** A growing area: an in-ground section, raised bed, or container. */
export interface Bed {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: "rect" | "circle";
  sunExposure?: AreaSunExposure;
  sunExposureLabel?: string;
}

/** A plant group placed in one growing area. */
export interface Plant {
  id: string;
  name: string;
  bedId: string;
  x: number;
  y: number;
  spacingInches: number;
  quantity: number;
  sunNeeds: PlantSunNeeds;
  placementReason: string;
  /** Locked share of the bed's zone length; absent until the bed is filled. */
  areaShare?: number;
  guideId?: string;
}

export interface Layout {
  version: string;
  units: string;
  garden: Garden;
  beds: Bed[];
  plants: Plant[];
}

// ---------- Plan ----------

export type PlantingWindow = "now" | "next_month" | "next_season";

export interface GuideEntry {
  id: string;
  plantName: string;
  quantity: number;
  whenToPlant: PlantingWindow;
  timingLabel: string;
  timingDetails: string;
  spacingInches: number;
  sowingAmount: string;
  plantingDepth: string;
  watering: string;
  notes: string;
}

export interface TipItem {
  title: string;
  detail: string;
}

export interface ContainerSetup {
  applicable: boolean;
  popularContainer: string;
  popularityReason: string;
  setupSteps: string[];
  compostAdvice: string;
  drainageAdvice: string;
}

export interface PlanTips {
  preferenceHelp: TipItem[];
  companionPlanting: TipItem[];
  avoid: TipItem[];
  watering: TipItem[];
  commonMistakes: TipItem[];
  containerSetup: ContainerSetup;
}

export interface Alternative {
  name: string;
  spacingInches: number;
  sunNeeds: PlantSunNeeds;
  reason: string;
  source: "ai" | "facts" | "plan";
}

export type AlternativesByBed = Record<string, Alternative[]>;

export interface GardenPlan {
  recommendedGardenType: RecommendedGardenType;
  summary: string;
  layout: Layout;
  tips: PlanTips;
  alternatives: AlternativesByBed;
  plantingGuide: GuideEntry[];
}

// ---------- Climate ----------

export interface FrostDates {
  /** Month-day ("04-25"), or null when no spring frost was recorded. */
  lastSpringFrost: string | null;
  firstFallFrost: string | null;
  growingSeasonDays: number;
  yearsAnalyzed: number;
}

export interface ForecastDay {
  date: string;
  minC: number;
  maxC: number;
}

export interface ForecastSummary {
  days: ForecastDay[];
  frostDays: string[];
  frostWarning: boolean;
}

export interface ClimateContext {
  hardinessZone: string;
  temperatureRange: string | null;
  frost: FrostDates | null;
  forecast: ForecastSummary | null;
}

// ---------- Chat ----------

export interface SwapSuggestion {
  plantId: string;
  bedId: string;
  from: string;
  replacement: string;
  reason: string;
  applied?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  source?: "plan" | "ai" | "notice";
  suggestions?: SwapSuggestion[];
}

// ---------- Crop rotation ----------

export type RotationGroup = "fruiting" | "legume" | "leafy" | "root" | "none";

export interface SeasonPlant {
  name: string;
  family: string;
  rotationGroup: RotationGroup;
}

export interface SavedSeason {
  id: string;
  planId: string;
  savedAt: string;
  label: string;
  zipCode: string;
  areas: { name: string; plants: SeasonPlant[] }[];
}

// ---------- AI responses (inferred from the Zod schemas) ----------

export type GardenPlanAiResponse = z.infer<typeof gardenPlanResponse>;
export type ChatAiResponse = z.infer<typeof chatResponse>;

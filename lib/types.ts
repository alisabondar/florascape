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
  /** Present on raw model output; normalized plans omit it (null means not applicable). */
  applicable?: boolean;
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
  containerSetup: ContainerSetup | null;
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

// ---------- Plant facts and companions (lib/plant-facts.json, lib/companions.json) ----------

export type PlantCategory = "flowers" | "vegetables" | "herbs" | "medicinal";
export type FrostTolerance = "tender" | "semi_hardy" | "hardy";

export interface PlantFact {
  name: string;
  aliases: string[];
  category: PlantCategory;
  easyCare: boolean;
  sowing: "transplant" | "direct";
  family: string;
  rotationGroup: RotationGroup;
  spacingInches: { min: number; max: number };
  daysToMaturity: number;
  sunNeeds: PlantSunNeeds;
  frostTolerance: FrostTolerance;
}

export interface CompanionPair {
  a: string;
  b: string;
  type: "helpful" | "conflict";
  reason: string;
}

// ---------- Stored planner result (sessionStorage) ----------

export interface StoredPlannerResult {
  plannerInput?: PlannerInput;
  plan?: GardenPlan | null;
  modelUsed?: string;
  apiWarning?: string;
  climate?: ClimateContext | null;
  cached?: boolean;
  chat?: ChatMessage[];
  /** Set by every writer (planner submit, starter plan), so always present once stored. */
  generatedAt: string;
  aiGeneratedAt?: string;
  selectedPlants?: string[];
}

// ---------- Sketch zoom ----------

/** Pan/zoom state for the sketch viewport. */
export interface ZoomView {
  scale: number;
  x: number;
  y: number;
}

// ---------- AI providers ----------

export interface AiGenerateRequest {
  prompt: string;
  /** JSON schema for structured output, as produced by toProviderSchema. */
  schema: unknown;
  temperature: number;
  fetchImpl?: typeof fetch;
}

export interface AiGenerateResult {
  ok: boolean;
  status: number;
  text: string;
  finishReason: string;
}

export interface AiProvider {
  name: string;
  generate(request: AiGenerateRequest): Promise<AiGenerateResult>;
}

export interface AiAttempt {
  provider: string;
  attempt: number;
  outcome: string;
  detail?: string;
}

/** Body returned by /api/generate-garden-plan (and stored in the plan cache). */
export interface PlanResponseBody {
  plan: GardenPlan;
  modelUsed: string;
  climate: ClimateContext | null;
  warning?: string;
  cached?: boolean;
}

// ---------- Planner form ----------

/** Raw planner form values; numeric fields stay strings until submit. */
export interface PlannerFormUnit {
  id: string;
  width: string;
  length: string;
  sunExposure: string;
}

export interface PlannerFormValues {
  zipCode: string;
  gardenType: string;
  preferences: string;
  plantTypes: string[];
  inGround: {
    width: string;
    length: string;
    sunniestSide: string;
    plotStyle: string;
    sectionCount: string;
  };
  units: PlannerFormUnit[];
}

/** Planner form errors keyed by field path ("zipCode", "inGround.width", "unit.<id>.width"). */
export type PlannerFormErrors = Record<string, string>;

// ---------- Plan progress stream ----------

/** NDJSON events sent while a plan is generated (lib/plan/generate-plan). */
export type PlanStreamEvent =
  | { type: "climate"; climate: ClimateContext | null }
  | { type: "generating"; provider: string }
  | { type: "result"; body: PlanResponseBody }
  | { type: "error"; error: string };

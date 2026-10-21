import { gardenPlanResponse, toProviderSchema } from "../schemas/responses";

export const RECOMMENDED_GARDEN_TYPES = new Set(["in_ground", "raised_beds", "containers"]);
export const SUN_LEVELS = new Set(["full_sun", "partial_shade", "mostly_shade"]);
export const PLANT_SUN_LEVELS = new Set(["full_sun", "partial_shade", "shade"]);
export const PLANTING_WINDOWS = new Set(["now", "next_month", "next_season"]);

// Generated from the Zod schema so validation and the provider schema share one definition.
export const GARDEN_PLAN_RESPONSE_SCHEMA = toProviderSchema(gardenPlanResponse);

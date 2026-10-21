import { z } from "zod";

/**
 * Converts a Zod schema to the JSON-schema subset AI providers accept for structured
 * output (Gemini's responseSchema): no $schema, no additionalProperties, and no
 * safe-integer bounds on integers.
 */
export function toProviderSchema(schema: z.ZodType): unknown {
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) {
      return node.map(strip);
    }
    if (!node || typeof node !== "object") {
      return node;
    }
    const record = node as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(record)) {
      if (key === "$schema" || key === "additionalProperties") {
        continue;
      }
      if (
        record.type === "integer" &&
        (key === "minimum" || key === "maximum") &&
        Math.abs(Number(value)) === Number.MAX_SAFE_INTEGER
      ) {
        continue;
      }
      result[key] = strip(value);
    }
    return result;
  };
  return strip(z.toJSONSchema(schema, { target: "openapi-3.0" }));
}

const tipItem = z.object({ title: z.string(), detail: z.string() });
const sunNeeds = z.enum(["full_sun", "partial_shade", "shade"]);

export const gardenPlanResponse = z.object({
  recommendedGardenType: z.enum(["in_ground", "raised_beds", "containers"]),
  summary: z.string(),
  layout: z.object({
    plants: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        bedId: z.string(),
        spacingInches: z.number(),
        quantity: z.int(),
        sunNeeds,
        placementReason: z.string(),
      }),
    ),
  }),
  tips: z.object({
    preferenceHelp: z.array(tipItem),
    companionPlanting: z.array(tipItem),
    avoid: z.array(tipItem),
    watering: z.array(tipItem),
    commonMistakes: z.array(tipItem),
    containerSetup: z.object({
      applicable: z.boolean(),
      popularContainer: z.string(),
      popularityReason: z.string(),
      setupSteps: z.array(z.string()),
      compostAdvice: z.string(),
      drainageAdvice: z.string(),
    }),
  }),
  plantingGuide: z.array(
    z.object({
      plantName: z.string(),
      whenToPlant: z.enum(["now", "next_month", "next_season"]),
      timingLabel: z.string(),
      timingDetails: z.string(),
      spacingInches: z.number(),
      sowingAmount: z.string(),
      plantingDepth: z.string(),
      watering: z.string(),
      notes: z.string(),
    }),
  ),
  alternatives: z.array(
    z.object({
      bedId: z.string(),
      plants: z.array(
        z.object({
          name: z.string(),
          spacingInches: z.number(),
          sunNeeds,
          reason: z.string(),
        }),
      ),
    }),
  ),
});

export const chatResponse = z.object({
  reply: z.string(),
  suggestions: z.array(
    z.object({
      plantId: z.string(),
      replacement: z.string(),
      reason: z.string(),
    }),
  ),
});

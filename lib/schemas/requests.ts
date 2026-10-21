import { z } from "zod";
import { GARDEN_TYPE_OPTIONS } from "../planner-config";

const gardenTypes = GARDEN_TYPE_OPTIONS.map((option) => option.value);
const dimension = z.union([z.number(), z.string()]);

// Loose objects: the routes' existing normalization still applies its detailed rules
// and drops unknown fields, so this layer only rejects malformed envelopes.
export const planRequest = z.object({
  plannerInput: z.looseObject({
    zipCode: z.string().trim().regex(/^\d{5}$/, "must be a 5-digit ZIP code"),
    gardenType: z.enum(gardenTypes),
    selectedPlants: z.array(z.string()).min(1).max(10),
    plantTypes: z.array(z.string()).max(10).optional(),
    preferences: z.string().optional(),
    inGround: z.looseObject({ width: dimension, length: dimension }).nullable().optional(),
    units: z.array(z.looseObject({ width: dimension, length: dimension })).max(12).optional(),
  }),
});

export const chatRequest = z.object({
  plan: z.looseObject({
    layout: z.looseObject({
      beds: z.array(z.looseObject({ id: z.string(), name: z.string() })).min(1),
      plants: z.array(z.looseObject({ id: z.string(), name: z.string(), bedId: z.string() })),
    }),
  }),
  climate: z.looseObject({}).nullable().optional(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(2000) }))
    .min(1)
    .max(50),
});

/** "Invalid request: plannerInput.zipCode (must be a 5-digit ZIP code), …" */
export function describeIssues(error: z.ZodError): string {
  const fields = error.issues.map((issue) => {
    const path = issue.path.length ? issue.path.join(".") : "body";
    return `${path} (${issue.message})`;
  });
  return `Invalid request: ${[...new Set(fields)].join(", ")}`;
}

/** Parses a request body; returns { data } or { error } with a field-naming message. */
export type ParsedRequest<T> = { data: T; error?: undefined } | { data?: undefined; error: string };

export function parseRequest<S extends z.ZodType>(schema: S, body: unknown): ParsedRequest<z.infer<S>> {
  const result = schema.safeParse(body);
  return result.success ? { data: result.data } : { error: describeIssues(result.error) };
}

import { findPlantFacts } from "../plant-facts";
import type { GardenPlan, GuideEntry } from "../types";

type Intent = "timing" | "spacing" | "quantity";

export interface PlanAnswer {
  text: string;
  source: "plan";
  plantName: string;
}

const INTENTS: { key: Intent; pattern: RegExp }[] = [
  { key: "timing", pattern: /\b(when|what time|sow|plant(ing)? (it|them|out)|start|transplant)\b/ },
  { key: "spacing", pattern: /\b(how far|spacing|space|apart|distance)\b/ },
  { key: "quantity", pattern: /\b(how many|number of|quantity|count)\b/ },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function namesFor(plantName: string): string[] {
  const fact = findPlantFacts(plantName);
  return [plantName, ...(fact ? [fact.name, ...fact.aliases] : [])].map((name) => name.toLowerCase());
}

/** The guide entry whose plant (or an alias) is named in the question, longest match first. */
export function findMentionedGuideEntry(
  question: unknown,
  plantingGuide: GuideEntry[] | null | undefined,
): GuideEntry | null {
  const text = ` ${String(question || "").toLowerCase()} `;
  // Asserted so narrowing does not ignore the assignments inside forEach.
  let best = null as { entry: GuideEntry; length: number } | null;
  (plantingGuide || []).forEach((entry) => {
    namesFor(entry.plantName).forEach((name) => {
      // Allow simple plurals ("tomatoes", "carrots") as well as the exact name.
      const pattern = new RegExp(`\\b${escapeRegExp(name)}(e?s)?\\b`);
      if (pattern.test(text) && (!best || name.length > best.length)) {
        best = { entry, length: name.length };
      }
    });
  });
  return best?.entry || null;
}

/**
 * Answers "when / how far apart / how many" questions about a plant in the guide straight
 * from the plan. Returns null when the question needs the AI.
 */
export function answerFromPlan(question: unknown, plan: Pick<GardenPlan, "plantingGuide"> | null | undefined): PlanAnswer | null {
  const entry = findMentionedGuideEntry(question, plan?.plantingGuide);
  if (!entry) {
    return null;
  }
  const text = String(question).toLowerCase();
  const intents = INTENTS.filter((intent) => intent.pattern.test(text)).map((intent) => intent.key);
  if (!intents.length) {
    return null;
  }

  const parts = intents.map((intent) => {
    if (intent === "timing") {
      return `${entry.timingLabel}. ${entry.timingDetails}`.trim();
    }
    if (intent === "spacing") {
      return `Space ${entry.plantName} about ${entry.spacingInches} inches apart.`;
    }
    return `Your plan targets ${entry.quantity} healthy mature ${entry.plantName} ${entry.quantity === 1 ? "plant" : "plants"}. ${entry.sowingAmount || ""}`.trim();
  });
  return { text: parts.join(" "), source: "plan", plantName: entry.plantName };
}

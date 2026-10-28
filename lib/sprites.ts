import { findPlantFacts } from "./plant-facts";

/** Plants with their own sprite sheet in public/sprites/sheets. */
export const SPRITE_IDS = [
  "basil", "bell-pepper", "carrot", "corn", "cucumber", "garlic", "green-bean", "kale", "lettuce", "marigold",
  "onion", "pea", "potato", "pumpkin", "radish", "spinach", "strawberry", "sunflower", "tomato", "zucchini",
] as const;
export type SpriteId = (typeof SPRITE_IDS)[number];

export const SPRITE_FRAME = { width: 16, height: 24, count: 5 } as const;

// Plants without their own sheet borrow the closest-looking one (keys are plant-facts names).
const LOOKALIKES: Record<string, SpriteId> = {
  "bush bean": "green-bean", "pole bean": "green-bean", edamame: "green-bean", "fava bean": "green-bean",
  "sweet pea": "pea",
  "hot pepper": "bell-pepper", eggplant: "bell-pepper", okra: "bell-pepper", tomatillo: "tomato",
  "leaf lettuce": "lettuce", "romaine lettuce": "lettuce", "butterhead lettuce": "lettuce", cabbage: "lettuce", "bok choy": "lettuce",
  "swiss chard": "spinach", arugula: "spinach", "mustard greens": "spinach",
  broccoli: "kale", cauliflower: "kale", "brussels sprouts": "kale", "collard greens": "kale", kohlrabi: "kale", celery: "kale",
  beet: "radish", turnip: "radish",
  "sweet potato": "potato", parsnip: "carrot",
  leek: "onion", shallot: "onion", chives: "onion",
  "sweet corn": "corn",
  "winter squash": "pumpkin", watermelon: "pumpkin", cantaloupe: "pumpkin",
};

function slug(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function isSpriteId(value: string): value is SpriteId {
  return (SPRITE_IDS as readonly string[]).includes(value);
}

/** The sprite to draw for a plant name: its own sheet, a look-alike, or one by category. */
export function spriteIdFor(plantName: string): SpriteId {
  const fact = findPlantFacts(plantName);
  const name = (fact?.name || plantName).trim().toLowerCase();
  const direct = slug(name);
  if (isSpriteId(direct)) {
    return direct;
  }
  if (LOOKALIKES[name]) {
    return LOOKALIKES[name];
  }
  if (fact?.category === "flowers" || fact?.category === "medicinal") {
    return "marigold";
  }
  if (fact?.category === "herbs") {
    return "basil";
  }
  return fact?.category === "vegetables" ? "lettuce" : "basil";
}

export function spriteSheetUrl(id: SpriteId) {
  return `/sprites/sheets/${id}.png`;
}

import { findPlantFacts } from "./plant-facts";

/** Plants with their own sprite sheet in public/sprites/sheets. */
export const SPRITE_IDS = [
  "basil", "beet", "bell-pepper", "black-eyed-susan", "bok-choy", "broccoli", "cabbage", "carrot", "cauliflower",
  "chamomile", "cilantro", "corn", "cosmos", "cucumber", "dill", "eggplant", "garlic", "green-bean", "hot-pepper",
  "kale", "lavender", "lettuce", "marigold", "mint", "nasturtium", "onion", "pansy", "parsley", "pea", "petunia",
  "potato", "pumpkin", "radish", "rosemary", "sage", "spinach", "strawberry", "sunflower", "swiss-chard", "thyme",
  "tomato", "watermelon", "zinnia", "zucchini",
] as const;
export type SpriteId = (typeof SPRITE_IDS)[number];

export const SPRITE_FRAME = { width: 16, height: 24, count: 5 } as const;

// Plants without their own sheet borrow the closest-looking one (keys are plant-facts names).
const LOOKALIKES: Record<string, SpriteId> = {
  "bush bean": "green-bean", "pole bean": "green-bean", edamame: "green-bean", "fava bean": "green-bean",
  "sweet pea": "pea",
  okra: "hot-pepper", tomatillo: "tomato",
  "leaf lettuce": "lettuce", "romaine lettuce": "lettuce", "butterhead lettuce": "lettuce",
  arugula: "spinach", "mustard greens": "bok-choy",
  "brussels sprouts": "cabbage", kohlrabi: "cabbage", "collard greens": "kale", celery: "bok-choy",
  turnip: "radish",
  "sweet potato": "potato", parsnip: "carrot",
  leek: "onion", shallot: "onion", chives: "onion", lemongrass: "onion",
  "sweet corn": "corn",
  "winter squash": "pumpkin", cantaloupe: "watermelon",
  oregano: "thyme", marjoram: "thyme", tarragon: "rosemary", fennel: "dill",
  "lemon balm": "mint", catnip: "mint", stevia: "mint",
  echinacea: "black-eyed-susan", yarrow: "chamomile", feverfew: "chamomile", borage: "sage", hyssop: "lavender",
  calendula: "marigold", snapdragon: "zinnia", celosia: "zinnia", "bachelor's button": "cosmos",
  impatiens: "petunia", begonia: "petunia", "sweet alyssum": "chamomile", coleus: "swiss-chard", hosta: "kale",
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

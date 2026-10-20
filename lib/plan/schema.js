export const RECOMMENDED_GARDEN_TYPES = new Set(["in_ground", "raised_beds", "containers"]);
export const SUN_LEVELS = new Set(["full_sun", "partial_shade", "mostly_shade"]);
export const PLANT_SUN_LEVELS = new Set(["full_sun", "partial_shade", "shade"]);
export const PLANTING_WINDOWS = new Set(["now", "next_month", "next_season"]);

export const TIP_ITEM_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    detail: { type: "string" },
  },
  required: ["title", "detail"],
};

export const GARDEN_PLAN_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    recommendedGardenType: {
      type: "string",
      enum: ["in_ground", "raised_beds", "containers"],
    },
    summary: { type: "string" },
    layout: {
      type: "object",
      properties: {
        plants: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              name: { type: "string" },
              bedId: { type: "string" },
              spacingInches: { type: "number" },
              quantity: { type: "integer" },
              sunNeeds: {
                type: "string",
                enum: ["full_sun", "partial_shade", "shade"],
              },
              placementReason: { type: "string" },
            },
            required: [
              "id",
              "name",
              "bedId",
              "spacingInches",
              "quantity",
              "sunNeeds",
              "placementReason",
            ],
          },
        },
      },
      required: ["plants"],
    },
    tips: {
      type: "object",
      properties: {
        preferenceHelp: { type: "array", items: TIP_ITEM_SCHEMA },
        companionPlanting: { type: "array", items: TIP_ITEM_SCHEMA },
        avoid: { type: "array", items: TIP_ITEM_SCHEMA },
        watering: { type: "array", items: TIP_ITEM_SCHEMA },
        commonMistakes: { type: "array", items: TIP_ITEM_SCHEMA },
        containerSetup: {
          type: "object",
          properties: {
            applicable: { type: "boolean" },
            popularContainer: { type: "string" },
            popularityReason: { type: "string" },
            setupSteps: { type: "array", items: { type: "string" } },
            compostAdvice: { type: "string" },
            drainageAdvice: { type: "string" },
          },
          required: [
            "applicable",
            "popularContainer",
            "popularityReason",
            "setupSteps",
            "compostAdvice",
            "drainageAdvice",
          ],
        },
      },
      required: [
        "preferenceHelp",
        "companionPlanting",
        "avoid",
        "watering",
        "commonMistakes",
        "containerSetup",
      ],
    },
    plantingGuide: {
      type: "array",
      items: {
        type: "object",
        properties: {
          plantName: { type: "string" },
          whenToPlant: {
            type: "string",
            enum: ["now", "next_month", "next_season"],
          },
          timingLabel: { type: "string" },
          timingDetails: { type: "string" },
          spacingInches: { type: "number" },
          sowingAmount: { type: "string" },
          plantingDepth: { type: "string" },
          watering: { type: "string" },
          notes: { type: "string" },
        },
        required: [
          "plantName",
          "whenToPlant",
          "timingLabel",
          "timingDetails",
          "spacingInches",
          "sowingAmount",
          "plantingDepth",
          "watering",
          "notes",
        ],
      },
    },
  },
  required: ["recommendedGardenType", "summary", "layout", "tips", "plantingGuide"],
};

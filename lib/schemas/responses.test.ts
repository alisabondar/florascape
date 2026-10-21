import { describe, expect, test } from "bun:test";
import handWritten from "./__fixtures__/hand-written-response-schemas.json";
import { chatResponse, gardenPlanResponse, toProviderSchema } from "./responses";

describe("Zod response schemas", () => {
  test("generate the same garden-plan schema as the hand-written one", () => {
    expect(toProviderSchema(gardenPlanResponse)).toStrictEqual(handWritten.gardenPlan);
  });

  test("generate the same chat schema as the hand-written one", () => {
    expect(toProviderSchema(chatResponse)).toStrictEqual(handWritten.chat);
  });
});

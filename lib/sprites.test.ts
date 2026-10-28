import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { PLANT_FACTS } from "./plant-facts";
import { SPRITE_IDS, spriteIdFor } from "./sprites";

describe("sprite mapping", () => {
  test("every sprite id has a sheet on disk", () => {
    SPRITE_IDS.forEach((id) => expect(existsSync(join(import.meta.dir, "..", "public", "sprites", "sheets", `${id}.png`))).toBe(true));
  });

  test("plants with their own sheet use it, including through aliases", () => {
    expect(spriteIdFor("Tomato")).toBe("tomato");
    expect(spriteIdFor("Cherry Tomato")).toBe("tomato");
    expect(spriteIdFor("Bell Pepper")).toBe("bell-pepper");
    expect(spriteIdFor("Green Bean")).toBe("green-bean");
    expect(spriteIdFor("Leaf Lettuce")).toBe("lettuce");
  });

  test("other plants borrow a look-alike or a category default", () => {
    expect(spriteIdFor("Leek")).toBe("onion");
    expect(spriteIdFor("Watermelon")).toBe("pumpkin");
    expect(spriteIdFor("Rosemary")).toBe("basil");
    expect(spriteIdFor("Zinnia")).toBe("marigold");
    expect(spriteIdFor("Mystery Vine")).toBe("basil");
  });

  test("every plant-facts entry maps to a sprite", () => {
    PLANT_FACTS.forEach((fact) => expect(SPRITE_IDS).toContain(spriteIdFor(fact.name)));
  });
});

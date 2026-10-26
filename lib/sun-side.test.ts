import { describe, expect, test } from "bun:test";
import { sidesOf, sunSideLabel, toggleSunSide } from "./sun-side";

describe("sun side selection", () => {
  test("a second adjacent side makes a corner, named north/south first", () => {
    expect(toggleSunSide("", "south")).toBe("south");
    expect(toggleSunSide("south", "west")).toBe("southwest");
    expect(toggleSunSide("west", "north")).toBe("northwest");
    expect(toggleSunSide("east", "south")).toBe("southeast");
  });

  test("the opposite side replaces the selection", () => {
    expect(toggleSunSide("south", "north")).toBe("north");
    expect(toggleSunSide("east", "west")).toBe("west");
  });

  test("a third side keeps the neighbor it touches", () => {
    expect(toggleSunSide("southwest", "east")).toBe("southeast");
    expect(toggleSunSide("southwest", "north")).toBe("northwest");
    expect(toggleSunSide("northeast", "west")).toBe("northwest");
  });

  test("clicking a selected side deselects it, and shaded clears to a fresh pick", () => {
    expect(toggleSunSide("southwest", "west")).toBe("south");
    expect(toggleSunSide("south", "south")).toBe("");
    expect(toggleSunSide("fully_shaded", "east")).toBe("east");
  });

  test("parses and labels values", () => {
    expect(sidesOf("southwest")).toEqual(["south", "west"]);
    expect(sidesOf("fully_shaded")).toEqual([]);
    expect(sunSideLabel("southwest")).toBe("Southwest");
    expect(sunSideLabel("fully_shaded")).toBe("Whole plot is shaded");
  });
});

import { describe, expect, test } from "bun:test";
import { createFallbackGardenPlan } from "./garden-plan";
import { albumTitle, MAX_SAVED_ALBUMS, parseAlbums, removeAlbum, upsertAlbum } from "./saved-albums";
import type { StoredPlannerResult } from "./types";

const plannerInput = {
  zipCode: "80205",
  gardenType: "raised_beds",
  gardenTypeLabel: "Raised beds",
  plantTypes: ["vegetables"],
  selectedPlants: ["Vegetables"],
  preferences: "",
  units: [{ width: 8, length: 4, sunExposure: "full_sun" }],
};

function result(generatedAt: string): StoredPlannerResult {
  return {
    generatedAt,
    plannerInput: { ...plannerInput, inGround: null, units: [{ id: "bed-1", name: "Bed 1", width: 8, length: 4, sunExposure: "full_sun", sunExposureLabel: "full_sun" }] } as StoredPlannerResult["plannerInput"],
    plan: createFallbackGardenPlan(plannerInput),
  };
}

describe("saved albums", () => {
  test("titles summarize the inputs and plant count", () => {
    expect(albumTitle(result("a"))).toMatch(/^80205 · 1 raised beds · \d+ plants$/);
  });

  test("saving the same plan updates it in place at the front; at most 12 are kept", () => {
    let albums = upsertAlbum([], result("a"));
    albums = upsertAlbum(albums, result("b"));
    albums = upsertAlbum(albums, result("a"));
    expect(albums.map((album) => album.id)).toEqual(["a", "b"]);
    for (let index = 0; index < 20; index += 1) {
      albums = upsertAlbum(albums, result(`plan-${index}`));
    }
    expect(albums).toHaveLength(MAX_SAVED_ALBUMS);
    expect(albums[0].id).toBe("plan-19");
  });

  test("plans without a plan body are not saved, and albums can be removed", () => {
    expect(upsertAlbum([], { generatedAt: "x", plan: null })).toEqual([]);
    expect(removeAlbum(upsertAlbum([], result("a")), "a")).toEqual([]);
  });

  test("parsing drops malformed entries", () => {
    const good = upsertAlbum([], result("a"));
    expect(parseAlbums([...good, { id: 1 }, null, "x"])).toHaveLength(1);
    expect(parseAlbums("nope")).toEqual([]);
  });
});

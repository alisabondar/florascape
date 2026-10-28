import type { StoredPlannerResult } from "./types";

/** Plans kept on this device, newest first. */
export const MAX_SAVED_ALBUMS = 12;

export interface SavedAlbum {
  /** The plan's id: when it was generated. */
  id: string;
  savedAt: string;
  title: string;
  result: StoredPlannerResult;
}

export function albumId(result: StoredPlannerResult): string {
  return result.aiGeneratedAt || result.generatedAt;
}

/** "80205 · 2 raised beds · 6 plants", or a fallback when inputs are missing. */
export function albumTitle(result: StoredPlannerResult): string {
  const input = result.plannerInput;
  const kinds = result.plan ? new Set(result.plan.layout.plants.map((plant) => plant.name.toLowerCase())).size : 0;
  const areas = input?.gardenType === "in_ground" ? "in-ground plot" : `${input?.units.length ?? 0} ${input?.gardenTypeLabel?.toLowerCase() || "areas"}`;
  return [input?.zipCode, areas, kinds ? `${kinds} plants` : ""].filter(Boolean).join(" · ") || "Garden album";
}

/** Adds or updates the album for this plan (it moves to the front), keeping at most 12. */
export function upsertAlbum(albums: readonly SavedAlbum[], result: StoredPlannerResult, now = new Date()): SavedAlbum[] {
  if (!result.plan) {
    return [...albums];
  }
  const id = albumId(result);
  const album: SavedAlbum = { id, savedAt: now.toISOString(), title: albumTitle(result), result };
  return [album, ...albums.filter((item) => item.id !== id)].slice(0, MAX_SAVED_ALBUMS);
}

export function removeAlbum(albums: readonly SavedAlbum[], id: string): SavedAlbum[] {
  return albums.filter((album) => album.id !== id);
}

/** Keeps only entries that look like saved albums with a plan. */
export function parseAlbums(value: unknown): SavedAlbum[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is SavedAlbum => {
    if (!item || typeof item !== "object") return false;
    const album = item as Partial<SavedAlbum>;
    return (
      typeof album.id === "string" &&
      typeof album.savedAt === "string" &&
      typeof album.title === "string" &&
      Boolean(album.result && typeof album.result === "object" && (album.result as StoredPlannerResult).plan)
    );
  });
}

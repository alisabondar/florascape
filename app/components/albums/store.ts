"use client";

import { useEffect, useState } from "react";
import { parseAlbums, removeAlbum, upsertAlbum } from "../../../lib/saved-albums";
import type { SavedAlbum } from "../../../lib/saved-albums";
import { PLANNER_RESULT_KEY, writeSessionJson } from "../../../lib/session-storage";
import type { StoredPlannerResult } from "../../../lib/types";

const STORAGE_KEY = "florascape_albums";
const ALBUMS_EVENT = "florascape:albums";

function loadAlbums(): SavedAlbum[] {
  try {
    return parseAlbums(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return [];
  }
}

function storeAlbums(albums: SavedAlbum[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(albums));
  } catch {
    // Storage full or disabled: the plan still lives in this tab's session.
  }
  window.dispatchEvent(new Event(ALBUMS_EVENT));
}

/** Saves (or updates) this plan on the device. Called whenever the results page stores it. */
export function saveAlbum(result: StoredPlannerResult) {
  if (result.plan) {
    storeAlbums(upsertAlbum(loadAlbums(), result));
  }
}

export function deleteAlbum(id: string) {
  storeAlbums(removeAlbum(loadAlbums(), id));
}

/** Opens a saved album on the results page. */
export function openAlbum(album: SavedAlbum) {
  writeSessionJson(PLANNER_RESULT_KEY, album.result);
  window.location.assign("/planner/result");
}

export function useSavedAlbums(): SavedAlbum[] {
  const [albums, setAlbums] = useState<SavedAlbum[]>([]);
  useEffect(() => {
    const refresh = () => setAlbums(loadAlbums());
    refresh();
    window.addEventListener(ALBUMS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(ALBUMS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return albums;
}

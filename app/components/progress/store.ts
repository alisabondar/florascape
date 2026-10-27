"use client";

import { useEffect, useState } from "react";
import { award, EMPTY_PROGRESS, parseProgress } from "../../../lib/progress";
import type { AwardResult, ProgressEvent, ProgressState } from "../../../lib/progress";

const STORAGE_KEY = "florascape_progress";
export const PROGRESS_EVENT = "florascape:progress";

export function loadProgress(): ProgressState {
  if (typeof window === "undefined") {
    return EMPTY_PROGRESS;
  }
  try {
    return parseProgress(JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null"));
  } catch {
    return EMPTY_PROGRESS;
  }
}

/** Records one progress event, saves it, and notifies listeners (badge, panel, toasts). */
export function recordProgress(event: ProgressEvent): AwardResult {
  const current = loadProgress();
  const result = award(current, event);
  if (result.state !== current) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(result.state));
  }
  if (result.xpGained > 0 || result.newBadges.length > 0) {
    window.dispatchEvent(new CustomEvent<AwardResult>(PROGRESS_EVENT, { detail: result }));
  }
  return result;
}

/** Current progress, kept in sync across components and browser tabs. */
export function useGardenerProgress(): ProgressState {
  const [state, setState] = useState<ProgressState>(EMPTY_PROGRESS);
  useEffect(() => {
    const refresh = () => setState(loadProgress());
    refresh();
    window.addEventListener(PROGRESS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return state;
}

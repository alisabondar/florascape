export const PLANNER_DRAFT_KEY = "florascape_planner_draft";
export const PLANNER_RESULT_KEY = "florascape_planner_result";

export function readSessionJson(key) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const value = window.sessionStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function writeSessionJson(key, value) {
  window.sessionStorage.setItem(key, JSON.stringify(value));
}

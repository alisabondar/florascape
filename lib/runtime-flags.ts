// Test and offline switches. FLORASCAPE_AI=off disables every AI provider;
// FLORASCAPE_CLIMATE=off skips the zone, frost, and forecast lookups.
export function aiEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.FLORASCAPE_AI !== "off";
}

export function climateEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.FLORASCAPE_CLIMATE !== "off";
}

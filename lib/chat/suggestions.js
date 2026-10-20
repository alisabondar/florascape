const MAX_SUGGESTIONS = 3;

const sameName = (left, right) =>
  String(left || "").trim().toLowerCase() === String(right || "").trim().toLowerCase();

/**
 * Keeps only swaps that the editor could perform: the plant group exists and the
 * replacement is one of that area's alternatives. Returns the alternative's exact name.
 */
export function filterSwapSuggestions(rawSuggestions, plan) {
  const kept = [];
  (Array.isArray(rawSuggestions) ? rawSuggestions : []).forEach((suggestion) => {
    const plant = plan?.layout?.plants?.find((item) => item.id === suggestion?.plantId);
    const alternative = plant
      ? plan.alternatives?.[plant.bedId]?.find((item) => sameName(item.name, suggestion?.replacement))
      : null;
    if (!plant || !alternative || kept.some((item) => item.plantId === plant.id)) {
      return;
    }
    kept.push({
      plantId: plant.id,
      bedId: plant.bedId,
      from: plant.name,
      replacement: alternative.name,
      reason: String(suggestion?.reason || "").trim().slice(0, 160),
    });
  });
  return kept.slice(0, MAX_SUGGESTIONS);
}

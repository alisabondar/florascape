export type CompassSide = "north" | "east" | "south" | "west";

export const COMPASS_SIDES: readonly CompassSide[] = ["north", "east", "south", "west"];
export const SHADED = "fully_shaded";

const OPPOSITE: Record<CompassSide, CompassSide> = {
  north: "south",
  south: "north",
  east: "west",
  west: "east",
};

function isSide(value: string): value is CompassSide {
  return (COMPASS_SIDES as readonly string[]).includes(value);
}

/** "southwest" → ["south", "west"]; "east" → ["east"]; anything else → []. */
export function sidesOf(value: string): CompassSide[] {
  if (isSide(value)) {
    return [value];
  }
  const match = /^(north|south)(east|west)$/.exec(value);
  return match ? [match[1] as CompassSide, match[2] as CompassSide] : [];
}

/** One side, or two adjacent sides joined north/south first ("southwest", never "westsouth"). */
export function sunSideValue(sides: readonly CompassSide[]): string {
  if (sides.length !== 2) {
    return sides[0] ?? "";
  }
  const vertical = sides.find((side) => side === "north" || side === "south");
  const horizontal = sides.find((side) => side === "east" || side === "west");
  return vertical && horizontal ? `${vertical}${horizontal}` : sides[1];
}

/**
 * Applies a click on one side of the compass. A second adjacent side makes a corner;
 * the opposite side replaces the selection; a third side keeps the neighbor it touches;
 * clicking a selected side deselects it.
 */
export function toggleSunSide(current: string, side: CompassSide): string {
  const selected = sidesOf(current);
  if (selected.includes(side)) {
    return sunSideValue(selected.filter((item) => item !== side));
  }
  if (selected.length === 0) {
    return side;
  }
  if (selected.length === 1) {
    return selected[0] === OPPOSITE[side] ? side : sunSideValue([selected[0], side]);
  }
  const neighbor = selected.find((item) => item !== OPPOSITE[side]);
  return sunSideValue(neighbor ? [neighbor, side] : [side]);
}

export function sunSideLabel(value: string): string {
  if (value === SHADED) {
    return "Whole plot is shaded";
  }
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : "";
}

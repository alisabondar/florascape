"use client";

import { Sun } from "lucide-react";
import { COMPASS_SIDES, SHADED, sidesOf, sunSideLabel, toggleSunSide } from "../../lib/sun-side";

interface SunSidePickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  ariaInvalid?: boolean;
  labelledBy?: string;
}

const SIDE_LABELS = { north: "North", east: "East", south: "South", west: "West" } as const;

/**
 * Compass picker for the plot's sunniest side. Pick one side, or two adjacent sides for a
 * corner (South + West = Southwest); "Whole plot is shaded" is exclusive.
 */
export default function SunSidePicker({ id, value, onChange, ariaInvalid = false, labelledBy }: SunSidePickerProps) {
  const selected = sidesOf(value);
  const shaded = value === SHADED;
  const plotClass = shaded ? "shaded" : value ? `lit-${value}` : "";

  return (
    <div className="sun-side-picker">
      <div
        id={id}
        role="group"
        aria-labelledby={labelledBy}
        data-invalid={ariaInvalid || undefined}
        className="sun-compass"
      >
        {COMPASS_SIDES.map((side) => {
          const pressed = selected.includes(side);
          return (
            <button
              key={side}
              type="button"
              aria-pressed={pressed}
              className={`sun-compass-option ${side}`}
              onClick={() => onChange(toggleSunSide(shaded ? "" : value, side))}
            >
              {pressed ? <Sun size={14} aria-hidden="true" /> : null}
              {SIDE_LABELS[side]}
            </button>
          );
        })}
        <div className={`sun-compass-plot ${plotClass}`} aria-hidden="true">
          Plot
        </div>
        <button
          type="button"
          aria-pressed={shaded}
          className="sun-compass-option shaded"
          onClick={() => onChange(shaded ? "" : SHADED)}
        >
          Whole plot is shaded
        </button>
      </div>
      <p className="sun-compass-result" aria-live="polite">
        {value ? `Most sun: ${sunSideLabel(value)}` : "No side picked yet"}
      </p>
      <p className="sun-compass-hint">
        Pick the sunniest side, or two neighboring sides for a corner (South + West = Southwest).
        In the Northern Hemisphere, the south side usually gets the most sun.
      </p>
    </div>
  );
}

"use client";

import { Sun } from "lucide-react";
import { useRef } from "react";
import type { KeyboardEvent } from "react";

interface SunSidePickerProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  ariaInvalid?: boolean;
  labelledBy?: string;
}

// Clockwise from north, so arrow keys walk around the compass; "shaded" comes last.
const SIDES = [
  { value: "north", label: "North", area: "n" },
  { value: "northeast", label: "NE", area: "ne" },
  { value: "east", label: "East", area: "e" },
  { value: "southeast", label: "SE", area: "se" },
  { value: "south", label: "South", area: "s" },
  { value: "southwest", label: "SW", area: "sw" },
  { value: "west", label: "West", area: "w" },
  { value: "northwest", label: "NW", area: "nw" },
  { value: "fully_shaded", label: "Whole plot is shaded", area: "shaded" },
];

const FULL_NAMES: Record<string, string> = {
  northeast: "Northeast",
  southeast: "Southeast",
  southwest: "Southwest",
  northwest: "Northwest",
};

/**
 * Compass-style single-choice picker for the plot's sunniest side. Follows the WAI-ARIA
 * radio group pattern: one tab stop, arrow keys move and select.
 */
export default function SunSidePicker({ id, value, onChange, ariaInvalid = false, labelledBy }: SunSidePickerProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectedIndex = SIDES.findIndex((side) => side.value === value);
  const focusIndex = selectedIndex === -1 ? 0 : selectedIndex;

  function select(index: number) {
    onChange(SIDES[index].value);
    refs.current[index]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const steps: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const step = steps[event.key];
    if (step) {
      event.preventDefault();
      select((index + step + SIDES.length) % SIDES.length);
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      select(index);
    }
  }

  return (
    <div className="sun-side-picker">
      <div
        id={id}
        role="radiogroup"
        aria-labelledby={labelledBy}
        aria-invalid={ariaInvalid || undefined}
        className="sun-compass"
      >
        {SIDES.map((side, index) => (
          <button
            key={side.value}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="radio"
            aria-checked={value === side.value}
            aria-label={FULL_NAMES[side.value]}
            tabIndex={index === focusIndex ? 0 : -1}
            className={`sun-compass-option ${side.area}`}
            onClick={() => select(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {value === side.value && side.value !== "fully_shaded" ? <Sun size={14} aria-hidden="true" /> : null}
            {side.label}
          </button>
        ))}
        <div
          className={`sun-compass-plot ${value && value !== "fully_shaded" ? `lit-${value}` : value === "fully_shaded" ? "shaded" : ""}`}
          aria-hidden="true"
        >
          Plot
        </div>
      </div>
      <p className="sun-compass-hint">
        In the Northern Hemisphere, the south side usually gets the most sun. Pick a corner if the sun favors one, like southwest.
      </p>
    </div>
  );
}

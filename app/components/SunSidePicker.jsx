"use client";

import { Sun } from "lucide-react";
import { useRef } from "react";

const SIDES = [
  { value: "north", label: "North", area: "north" },
  { value: "east", label: "East", area: "east" },
  { value: "south", label: "South", area: "south" },
  { value: "west", label: "West", area: "west" },
  { value: "fully_shaded", label: "Whole plot is shaded", area: "shaded" },
];

/**
 * Compass-style single-choice picker for the plot's sunniest side. Follows the WAI-ARIA
 * radio group pattern: one tab stop, arrow keys move and select.
 */
export default function SunSidePicker({ id, value, onChange, ariaInvalid = false, labelledBy }) {
  const refs = useRef([]);
  const selectedIndex = SIDES.findIndex((side) => side.value === value);
  const focusIndex = selectedIndex === -1 ? 0 : selectedIndex;

  function select(index) {
    onChange(SIDES[index].value);
    refs.current[index]?.focus();
  }

  function onKeyDown(event, index) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
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
        In the Northern Hemisphere, the south side usually gets the most sun.
      </p>
    </div>
  );
}

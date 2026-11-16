"use client";

import { useEffect, useRef, useState } from "react";
import type { PlannerFormValues } from "../../lib/types";

export interface PreviewArea {
  id: string;
  label: string;
  width: number;
  length: number;
  /** In-ground plots split into this many sections, drawn as strips along the long side. */
  sections?: number;
}

const MAX_HEIGHT_PX = 300;
const MIN_BED_PX = 64; // narrow beds stay wide enough for their labels
const GAP_PX = 28;
const TOP_PX = 40; // bed name + width dimension
const BOTTOM_PX = 8;
const SIDE_PX = 34; // length dimension on the left

/** Areas with usable dimensions from the planner form, in the form's order. */
export function previewAreas(formValues: PlannerFormValues, areaLabel: string): PreviewArea[] {
  const toFeet = (value: string): number | null => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  };

  if (formValues.gardenType === "in_ground") {
    const width = toFeet(formValues.inGround.width);
    const length = toFeet(formValues.inGround.length);
    // Only a plot divided into sections shows its sections.
    const sections =
      formValues.inGround.plotStyle === "sections"
        ? Math.max(1, Math.min(12, Math.floor(Number(formValues.inGround.sectionCount) || 1)))
        : 1;
    return width && length ? [{ id: "plot", label: "In-ground plot", width, length, sections }] : [];
  }

  return formValues.units
    .map((unit, index) => ({
      id: unit.id,
      label: `${areaLabel} ${index + 1}`,
      width: toFeet(unit.width),
      length: toFeet(unit.length),
    }))
    .filter((area): area is PreviewArea => Boolean(area.width && area.length));
}

function feet(value: number) {
  return `${Math.round(value * 10) / 10} ft`;
}

/**
 * A preview of the growing areas that fills the card: beds keep their proportions to each
 * other (roughly; very narrow ones are widened so labels fit), and every bed and section
 * is labeled with its size.
 */
export default function AreaPreview({ areas }: { areas: PreviewArea[] }) {
  const ref = useRef<HTMLElement | null>(null);
  const [available, setAvailable] = useState(560);
  const hasAreas = areas.length > 0;

  useEffect(() => {
    const node = ref.current;
    if (!node) {
      return undefined;
    }
    setAvailable(node.clientWidth);
    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
    // The figure only mounts once there's an area to draw, so measure again then.
  }, [hasAreas]);

  if (!areas.length) {
    return null;
  }

  // One shared scale, as large as the card allows; beds sit in a single row.
  const room = Math.max(160, available - SIDE_PX - GAP_PX * (areas.length - 1));
  const totalWidthFt = areas.reduce((sum, area) => sum + area.width, 0);
  const tallestFt = Math.max(...areas.map((area) => area.length));
  const scale = Math.min(MAX_HEIGHT_PX / tallestFt, room / totalWidthFt);
  let cursor = SIDE_PX;
  const shapes = areas.map((area) => {
    const widthPx = Math.max(MIN_BED_PX, area.width * scale);
    const shape = { ...area, x: cursor, widthPx, heightPx: Math.max(36, area.length * scale) };
    cursor += widthPx + GAP_PX;
    return shape;
  });
  const viewWidth = Math.max(1, cursor - GAP_PX);
  const viewHeight = TOP_PX + Math.max(...shapes.map((shape) => shape.heightPx)) + BOTTOM_PX;

  return (
    <figure className="area-preview" aria-live="polite" ref={ref}>
      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        width="100%"
        style={{ maxWidth: viewWidth }}
        role="img"
        aria-label={`Preview: ${areas
          .map((area) => `${area.label} ${area.width} by ${area.length} feet${area.sections && area.sections > 1 ? ` in ${area.sections} sections` : ""}`)
          .join(", ")}`}
      >
        {shapes.map((shape) => {
          const top = TOP_PX;
          const bottom = top + shape.heightPx;
          const sections = shape.sections && shape.sections > 1 ? shape.sections : 0;
          // Sections run across the long side, like rows in a plot.
          const alongWidth = shape.width >= shape.length;
          const sectionFt = sections ? (alongWidth ? shape.width : shape.length) / sections : 0;
          return (
            <g key={shape.id}>
              <text x={shape.x} y={13} className="area-preview-name">
                {shape.label}
              </text>
              {/* Width, above the bed. */}
              <line x1={shape.x} y1={top - 9} x2={shape.x + shape.widthPx} y2={top - 9} className="area-preview-dim" />
              <line x1={shape.x} y1={top - 14} x2={shape.x} y2={top - 4} className="area-preview-dim" />
              <line x1={shape.x + shape.widthPx} y1={top - 14} x2={shape.x + shape.widthPx} y2={top - 4} className="area-preview-dim" />
              <text x={shape.x + shape.widthPx / 2} y={top - 13} textAnchor="middle" className="area-preview-size">
                {feet(shape.width)}
              </text>
              {/* Length, to the left of the bed. */}
              <line x1={shape.x - 10} y1={top} x2={shape.x - 10} y2={bottom} className="area-preview-dim" />
              <line x1={shape.x - 15} y1={top} x2={shape.x - 5} y2={top} className="area-preview-dim" />
              <line x1={shape.x - 15} y1={bottom} x2={shape.x - 5} y2={bottom} className="area-preview-dim" />
              <text
                x={shape.x - 14}
                y={(top + bottom) / 2}
                textAnchor="middle"
                className="area-preview-size"
                transform={`rotate(-90 ${shape.x - 14} ${(top + bottom) / 2})`}
              >
                {feet(shape.length)}
              </text>
              <rect x={shape.x} y={top} width={shape.widthPx} height={shape.heightPx} style={{ fill: "#7a4a2a" }} className="area-preview-bed" />
              {sections
                ? Array.from({ length: sections }, (_, index) => {
                    const size = alongWidth ? shape.widthPx / sections : shape.heightPx / sections;
                    const x = alongWidth ? shape.x + index * size : shape.x;
                    const y = alongWidth ? top : top + index * size;
                    const w = alongWidth ? size : shape.widthPx;
                    const h = alongWidth ? shape.heightPx : size;
                    const label = alongWidth ? `${feet(sectionFt)} × ${feet(shape.length)}` : `${feet(shape.width)} × ${feet(sectionFt)}`;
                    return (
                      <g key={index}>
                        {index ? (
                          <line
                            x1={x}
                            y1={y}
                            x2={alongWidth ? x : x + w}
                            y2={alongWidth ? y + h : y}
                            className="area-preview-divider"
                          />
                        ) : null}
                        {(alongWidth ? w : h) >= 26 && w >= 60 ? (
                          <text x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle" className="area-preview-inner">
                            {label}
                          </text>
                        ) : null}
                      </g>
                    );
                  })
                : null}
            </g>
          );
        })}
      </svg>
      <figcaption>Live preview: sizes are labeled, shapes are roughly to scale.</figcaption>
    </figure>
  );
}

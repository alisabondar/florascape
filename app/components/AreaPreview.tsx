import type { PlannerFormValues } from "../../lib/types";

export interface PreviewArea {
  id: string;
  label: string;
  width: number;
  length: number;
}

const PREVIEW_HEIGHT_PX = 120;
const PREVIEW_MAX_WIDTH_PX = 560;
const GAP_PX = 14;
const LABEL_PX = 18;

/** Areas with usable dimensions from the planner form, in the form's order. */
export function previewAreas(formValues: PlannerFormValues, areaLabel: string): PreviewArea[] {
  const toFeet = (value: string): number | null => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : null;
  };

  if (formValues.gardenType === "in_ground") {
    const width = toFeet(formValues.inGround.width);
    const length = toFeet(formValues.inGround.length);
    return width && length ? [{ id: "plot", label: "In-ground plot", width, length }] : [];
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

export default function AreaPreview({ areas }: { areas: PreviewArea[] }) {
  if (!areas.length) {
    return null;
  }

  // One shared scale keeps areas proportional to each other.
  const totalWidthFt = areas.reduce((sum, area) => sum + area.width, 0);
  const tallestFt = Math.max(...areas.map((area) => area.length));
  const scale = Math.min(
    PREVIEW_HEIGHT_PX / tallestFt,
    (PREVIEW_MAX_WIDTH_PX - GAP_PX * (areas.length - 1)) / totalWidthFt,
  );
  let cursor = 0;
  const shapes = areas.map((area) => {
    const shape = { ...area, x: cursor, widthPx: area.width * scale, heightPx: area.length * scale };
    cursor += shape.widthPx + GAP_PX;
    return shape;
  });
  const viewWidth = Math.max(1, cursor - GAP_PX);
  const viewHeight = tallestFt * scale + LABEL_PX * 2;

  return (
    <figure className="area-preview" aria-live="polite">
      <svg
        viewBox={`0 0 ${viewWidth} ${viewHeight}`}
        width={viewWidth}
        height={viewHeight}
        role="img"
        aria-label={`Preview: ${areas.map((area) => `${area.label} ${area.width} by ${area.length} feet`).join(", ")}`}
      >
        {shapes.map((shape) => (
          <g key={shape.id}>
            <text x={shape.x} y={LABEL_PX - 5} className="area-preview-name">
              {shape.label}
            </text>
            <rect
              x={shape.x}
              y={LABEL_PX}
              width={Math.max(2, shape.widthPx)}
              height={Math.max(2, shape.heightPx)}
              style={{ fill: "#7a4a2a" }}
              className="area-preview-bed"
            />
            <text
              x={shape.x + shape.widthPx / 2}
              y={LABEL_PX + shape.heightPx + LABEL_PX - 4}
              textAnchor="middle"
              className="area-preview-size"
            >
              {shape.width} × {shape.length} ft
            </text>
          </g>
        ))}
      </svg>
      <figcaption>Live preview, drawn to scale</figcaption>
    </figure>
  );
}

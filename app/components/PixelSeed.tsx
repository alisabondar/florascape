import type { CSSProperties } from "react";

interface PixelSeedProps {
  /** Screen pixels per art pixel (the art is 16 × 24, the same frame as a plant sprite). */
  scale?: number;
}

// A cream seed on a light dirt mound, outlined dark so it reads on brown soil.
// Each row lists [x, width, color] runs; y is the row index from the top of the art.
const OUTLINE = "#2b1d14";
const SEED = "#f6e7b8";
const SHINE = "#fffaf0";
const SHADE = "#d9b977";
const MOUND = "#b8854f";
const ROWS: Record<number, [number, number, string][]> = {
  13: [[6, 4, OUTLINE]],
  14: [[5, 1, OUTLINE], [6, 2, SHINE], [8, 2, SEED], [10, 1, OUTLINE]],
  15: [[4, 1, OUTLINE], [5, 1, SHINE], [6, 4, SEED], [10, 1, SHADE], [11, 1, OUTLINE]],
  16: [[4, 1, OUTLINE], [5, 5, SEED], [10, 1, SHADE], [11, 1, OUTLINE]],
  17: [[4, 1, OUTLINE], [5, 4, SEED], [9, 2, SHADE], [11, 1, OUTLINE]],
  18: [[5, 1, OUTLINE], [6, 4, SHADE], [10, 1, OUTLINE]],
  19: [[2, 4, OUTLINE], [6, 4, OUTLINE], [10, 4, OUTLINE]],
  20: [[1, 1, OUTLINE], [2, 12, MOUND], [14, 1, OUTLINE]],
  21: [[0, 1, OUTLINE], [1, 14, MOUND], [15, 1, OUTLINE]],
  22: [[0, 16, OUTLINE]],
};

/** A pixel seed for plants that haven't sprouted yet; same footprint as PixelSprite. */
export default function PixelSeed({ scale = 3 }: PixelSeedProps) {
  const style = { width: 16 * scale, height: 24 * scale, flexShrink: 0 } as CSSProperties;
  return (
    <svg className="pixel-seed" viewBox="0 0 16 24" style={style} shapeRendering="crispEdges" aria-hidden="true">
      {Object.entries(ROWS).flatMap(([y, runs]) =>
        runs.map(([x, width, color]) => <rect key={`${y}-${x}`} x={x} y={Number(y)} width={width} height={1} fill={color} />),
      )}
    </svg>
  );
}

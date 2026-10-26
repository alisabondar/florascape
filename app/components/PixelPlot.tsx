"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { layoutToSvgModel } from "../../lib/garden-layout";
import { startingAmountLabel } from "../../lib/plan/shopping";
import type { Layout, Plant } from "../../lib/types";
import PixelSprite from "./PixelSprite";
import "./pixel.css";

interface PixelPlotProps {
  layout: Layout;
  /** Called with the plant group when its zone is clicked or activated by keyboard. */
  onZoneSelect?: (plant: Plant) => void;
  selectedPlantId?: string | null;
  /** Hide the per-zone packet tags (e.g. when a look shows counts elsewhere). */
  showTags?: boolean;
  /** Largest tile size in px for one foot of bed. */
  maxTile?: number;
  className?: string;
}

const MAX_SPRITES_PER_ZONE = 24;

/**
 * Top-down pixel garden: each bed is a soil-tile grid (one tile per foot) and each plant
 * zone is filled with that plant's animated sprite. Zones come from the same layout model
 * as the hand-drawn sketch, so edits, swaps, and shuffles appear in both.
 */
export default function PixelPlot({
  layout,
  onZoneSelect,
  selectedPlantId = null,
  showTags = true,
  maxTile = 44,
  className = "",
}: PixelPlotProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return undefined;
    }
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const model = useMemo(() => layoutToSvgModel(layout, 1, 0), [layout]);
  const plants = useMemo(() => new Map(layout.plants.map((plant) => [plant.id, plant])), [layout.plants]);
  const tile = Math.max(18, Math.min(maxTile, Math.floor(width / Math.max(1, layout.garden.width))));
  const spriteScale = Math.max(1, Math.floor((tile * 0.9) / 16));

  return (
    <div ref={containerRef} className={`pixel-plot ${className}`.trim()}>
      <div
        className="pixel-plot-ground"
        style={{ width: layout.garden.width * tile, height: layout.garden.height * tile, "--tile": `${tile}px` } as CSSProperties}
        role="group"
        aria-label="Pixel garden plot"
      >
        {model.beds.map((bed) => (
          <div
            key={bed.id}
            className={`pixel-bed${bed.shape === "circle" ? " circle" : ""}`}
            style={{ left: bed.x * tile, top: bed.y * tile, width: bed.width * tile, height: bed.height * tile }}
          >
            <span className="pixel-bed-name">{bed.name}</span>
          </div>
        ))}
        {model.plantPatches.map((patch, zoneIndex) => {
          const plant = plants.get(patch.plantId);
          if (!plant) {
            return null;
          }
          const columns = Math.max(1, Math.floor(patch.width));
          const rows = Math.max(1, Math.floor(patch.height));
          const spriteCount = Math.min(MAX_SPRITES_PER_ZONE, columns * rows, Math.max(1, plant.quantity || 1));
          const selected = plant.id === selectedPlantId;
          return (
            <button
              type="button"
              key={patch.id}
              className={`pixel-zone${selected ? " selected" : ""}`}
              style={{
                left: patch.x * tile,
                top: patch.y * tile,
                width: patch.width * tile,
                height: patch.height * tile,
                gridTemplateColumns: `repeat(${Math.min(columns, spriteCount)}, 1fr)`,
              }}
              onClick={() => onZoneSelect?.(plant)}
              aria-pressed={onZoneSelect ? selected : undefined}
              aria-label={`${plant.name}, ${plant.quantity} mature plants, ${startingAmountLabel(plant.name, plant.quantity)}`}
            >
              {Array.from({ length: spriteCount }, (_, index) => (
                <PixelSprite
                  key={index}
                  plantName={plant.name}
                  scale={spriteScale}
                  delay={zoneIndex * 0.25 + index * 0.04}
                />
              ))}
              {showTags ? (
                // Narrow zones get just the count; the full text is in the zone's aria-label.
                <span className="pixel-zone-tag" aria-hidden="true">
                  {patch.width * tile >= 110 ? (
                    <>
                      <b>{plant.name}</b> · {plant.quantity} {plant.quantity === 1 ? "plant" : "plants"}
                    </>
                  ) : (
                    <b>×{plant.quantity}</b>
                  )}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

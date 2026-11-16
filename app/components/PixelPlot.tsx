"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { layoutToSvgModel, plantSpots } from "../../lib/garden-layout";
import { startingAmountLabel } from "../../lib/plan/shopping";
import type { Layout, Plant } from "../../lib/types";
import PixelSprite from "./PixelSprite";
import "./pixel.css";

interface PixelPlotProps {
  layout: Layout;
  /** Called with the plant group when its zone is clicked or activated by keyboard. */
  onZoneSelect?: (plant: Plant) => void;
  /** Dragging one zone onto another (mouse or pen) swaps the two plant groups. */
  onSwapZones?: (firstId: string, secondId: string) => void;
  selectedPlantId?: string | null;
  /** Hide the per-zone packet tags (e.g. when a look shows counts elsewhere). */
  showTags?: boolean;
  /** Largest tile size in px for one foot of bed. */
  maxTile?: number;
  /** Tallest the ground may draw, in px; long gardens shrink their tiles to fit. */
  maxHeight?: number;
  /** false draws every plant fully grown and still (e.g. a static sample). */
  animate?: boolean;
  /** Draw every plant at one still growth stage (0 seed … 3 mature) instead. */
  stage?: 0 | 1 | 2 | 3;
  className?: string;
}

/** Past this many plants a zone draws footprint dots instead of one sprite each. */
const MAX_SPRITES_PER_ZONE = 60;
/** Room a zone tag takes at the bottom of its zone, in px. */
const TAG_HEIGHT = 22;

/**
 * Top-down pixel garden: each bed is a soil-tile grid (one tile per foot) and each plant
 * zone is filled with that plant's animated sprite. Zones come from the same layout model
 * as the hand-drawn sketch, so edits, swaps, and shuffles appear in both.
 */
export default function PixelPlot({
  layout,
  onZoneSelect,
  onSwapZones,
  selectedPlantId = null,
  showTags = true,
  maxTile = 44,
  maxHeight,
  animate = true,
  stage,
  className = "",
}: PixelPlotProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return undefined;
    }
    // Measure right away (don't wait for the first resize event), then keep in sync.
    setWidth(node.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Drag-to-swap: a press that moves more than a few pixels becomes a drag; one that
  // doesn't stays a normal click (so keyboard and touch users just select).
  const dragRef = useRef<{ fromId: string; x: number; y: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const [drag, setDrag] = useState<{ fromId: string; overId: string | null } | null>(null);

  function zoneIdAt(clientX: number, clientY: number) {
    const element = document.elementFromPoint(clientX, clientY);
    return element instanceof Element ? element.closest<HTMLElement>("[data-plant-id]")?.dataset.plantId ?? null : null;
  }

  function onPointerDown(event: PointerEvent<HTMLButtonElement>, plantId: string) {
    if (!onSwapZones || event.pointerType === "touch" || event.button !== 0) {
      return;
    }
    dragRef.current = { fromId: plantId, x: event.clientX, y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const current = dragRef.current;
    if (!current) {
      return;
    }
    if (!current.moved && Math.hypot(event.clientX - current.x, event.clientY - current.y) > 6) {
      current.moved = true;
    }
    if (current.moved) {
      const overId = zoneIdAt(event.clientX, event.clientY);
      setDrag({ fromId: current.fromId, overId: overId !== current.fromId ? overId : null });
    }
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const current = dragRef.current;
    dragRef.current = null;
    setDrag(null);
    if (!current?.moved) {
      return;
    }
    suppressClickRef.current = true;
    const overId = zoneIdAt(event.clientX, event.clientY);
    if (overId && overId !== current.fromId) {
      onSwapZones?.(current.fromId, overId);
    }
  }

  const interactive = Boolean(onZoneSelect || onSwapZones);
  const model = useMemo(() => layoutToSvgModel(layout, 1, 0), [layout]);
  // Divider lines sit midway in the gap between consecutive sections of the same bed
  // (sections run along a bed's long axis, in the order the layout allocated them).
  const dividers = useMemo(() => {
    const lines: { key: string; x: number; y: number; width: number; height: number; vertical: boolean }[] = [];
    model.beds.forEach((bed) => {
      const patches = model.plantPatches.filter((patch) => patch.bedId === bed.id);
      const vertical = bed.width >= bed.height;
      for (let index = 1; index < patches.length; index += 1) {
        const previous = patches[index - 1];
        const next = patches[index];
        lines.push(
          vertical
            ? { key: `${bed.id}-${index}`, x: (previous.x + previous.width + next.x) / 2, y: bed.y, width: 0, height: bed.height, vertical }
            : { key: `${bed.id}-${index}`, x: bed.x, y: (previous.y + previous.height + next.y) / 2, width: bed.width, height: 0, vertical },
        );
      }
    });
    return lines;
  }, [model]);
  const plants = useMemo(() => new Map(layout.plants.map((plant) => [plant.id, plant])), [layout.plants]);
  const heightCap = maxHeight ? Math.floor(maxHeight / Math.max(1, layout.garden.height)) : Infinity;
  const tile = Math.max(18, Math.min(maxTile, heightCap, Math.floor(width / Math.max(1, layout.garden.width))));
  const spriteScale = Math.max(1, Math.floor((tile * 0.9) / 16));

  return (
    <div ref={containerRef} className={`pixel-plot${interactive ? "" : " static"} ${className}`.trim()}>
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
        {dividers.map((line) => (
          <span
            key={line.key}
            className="pixel-zone-divider"
            aria-hidden="true"
            style={
              line.vertical
                ? { left: line.x * tile - 1.5, top: line.y * tile + 3, width: 3, height: line.height * tile - 6 }
                : { left: line.x * tile + 3, top: line.y * tile - 1.5, width: line.width * tile - 6, height: 3 }
            }
          />
        ))}
        {model.plantPatches.map((patch, zoneIndex) => {
          const plant = plants.get(patch.plantId);
          if (!plant) {
            return null;
          }
          // Plants sit on the spacing grid the planner counts quantities from, so the
          // picture shows the real number of plants and the room each one gets.
          const bed = model.beds.find((item) => item.id === patch.bedId);
          const spots = plantSpots(patch, plant, bed);
          const cell = (Math.max(1, Number(plant.spacingInches) || 8) / 12) * tile;
          // Each plant gets its own sprite only while one fits its spacing; denser zones
          // switch to footprint dots with a single sprite as the zone's icon.
          const detailed = cell >= 21 && spots.length <= MAX_SPRITES_PER_ZONE;
          // Wider-spaced plants draw a bit bigger (a tomato reads larger than a radish), capped
          // at 3× so a lone plant in a big section doesn't balloon.
          const zoneScale = Math.max(1, Math.min(3, Math.floor((cell * 0.75) / 16), Math.round((cell * 0.4) / 16)));
          const iconScale = Math.max(1, Math.min(2, spriteScale, Math.floor((Math.min(patch.width, patch.height) * tile * 0.6) / 24)));
          const motion = stage !== undefined ? "still" : animate ? "grow" : "still";
          const selected = plant.id === selectedPlantId;
          const label = `${plant.name}, ${plant.quantity} mature plants, ${startingAmountLabel(plant.name, plant.quantity)}`;
          const zoneWidth = patch.width * tile;
          const zoneHeight = patch.height * tile;
          const zoneStyle = { left: patch.x * tile, top: patch.y * tile, width: zoneWidth, height: zoneHeight };
          // With a tag, rows squeeze up a little so the tag never hides a plant.
          const squeeze = showTags && zoneHeight > TAG_HEIGHT * 2 ? (zoneHeight - TAG_HEIGHT) / zoneHeight : 1;
          const spotX = (spot: { x: number }) => (spot.x - patch.x) * tile;
          const spotY = (spot: { y: number }) => (spot.y - patch.y) * tile * squeeze;
          const footprintRadius = Math.max(1.5, cell * squeeze * (detailed ? 0.46 : 0.36));
          const contents = (
            <>
              <svg className={`pixel-footprints${detailed ? "" : " dense"}`} width={zoneWidth} height={zoneHeight} aria-hidden="true">
                {spots.map((spot, index) => (
                  <circle key={index} cx={spotX(spot)} cy={spotY(spot)} r={footprintRadius} />
                ))}
              </svg>
              {detailed ? (
                spots.map((spot, index) => (
                  <PixelSprite
                    key={index}
                    className="pixel-spot"
                    style={{ left: spotX(spot), top: spotY(spot) + cell * squeeze * 0.3 }}
                    plantName={plant.name}
                    scale={zoneScale}
                    motion={motion}
                    stage={stage}
                    delay={zoneIndex * 0.25 + index * 0.04}
                  />
                ))
              ) : (
                <PixelSprite
                  className="pixel-spot icon"
                  style={{ left: zoneWidth / 2, top: (zoneHeight * squeeze) / 2 + 12 * iconScale }}
                  plantName={plant.name}
                  scale={iconScale}
                  motion={motion}
                  stage={stage}
                  delay={zoneIndex * 0.25}
                />
              )}
              {showTags && detailed ? <SpacingMarker spots={spots.map((spot) => ({ x: spotX(spot), y: spotY(spot) }))} radius={footprintRadius} inches={plant.spacingInches} /> : null}
              {showTags ? (
                // Narrow zones get just the count; the full text is in the zone's aria-label.
                <span className="pixel-zone-tag" aria-hidden="true">
                  {patch.width * tile >= 190 ? (
                    <>
                      <b>{plant.name}</b> · {plant.quantity} {plant.quantity === 1 ? "plant" : "plants"}
                      {detailed ? null : ` · ${spacingLabel(plant.spacingInches)} apart`}
                    </>
                  ) : patch.width * tile >= 110 ? (
                    <>
                      <b>{plant.name}</b> · {plant.quantity}
                      {detailed ? null : ` · ${spacingLabel(plant.spacingInches)}`}
                    </>
                  ) : (
                    <b>×{plant.quantity}{detailed ? null : ` · ${spacingLabel(plant.spacingInches)}`}</b>
                  )}
                </span>
              ) : null}
            </>
          );
          // Without click or drag handlers (e.g. a sample garden), zones are plain pictures:
          // no button, no hover or focus highlight.
          if (!interactive) {
            return (
              <div
                key={patch.id}
                role="img"
                aria-label={label}
                className="pixel-zone static"
                style={zoneStyle}
              >
                {contents}
              </div>
            );
          }
          return (
            <button
              type="button"
              key={patch.id}
              data-plant-id={plant.id}
              className={`pixel-zone${selected ? " selected" : ""}${drag?.fromId === plant.id ? " drag-source" : ""}${drag?.overId === plant.id ? " drop-target" : ""}`}
              style={zoneStyle}
              onClick={() => {
                if (suppressClickRef.current) {
                  suppressClickRef.current = false;
                  return;
                }
                onZoneSelect?.(plant);
              }}
              onPointerDown={(event) => onPointerDown(event, plant.id)}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={() => {
                dragRef.current = null;
                setDrag(null);
              }}
              aria-pressed={onZoneSelect ? selected : undefined}
              aria-label={label}
              title={`${plant.name}: ${plant.quantity} mature plants (${startingAmountLabel(plant.name, plant.quantity)}) · ${plant.spacingInches} in spacing · about ${Math.round(patch.width * 4) / 4} × ${Math.round(patch.height * 4) / 4} ft${plant.placementReason ? `\n${plant.placementReason}` : ""}`}
            >
              {contents}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function spacingLabel(inches: number) {
  return `${Math.round(Number(inches) || 8)}″`;
}

/**
 * A dimension line between the first two plants of a zone (center to center), labeled
 * with the spacing, so the gap reads straight off the sketch. A lone plant gets one
 * across its circle instead.
 */
function SpacingMarker({ spots, radius, inches }: { spots: { x: number; y: number }[]; radius: number; inches: number }) {
  const [first, second] = spots;
  if (!first) {
    return null;
  }
  const pair = second
    ? { from: first, to: Math.abs(second.y - first.y) < 0.5 ? second : { x: first.x, y: second.y } }
    : { from: { x: first.x - radius, y: first.y }, to: { x: first.x + radius, y: first.y } };
  const horizontal = Math.abs(pair.to.y - pair.from.y) < 0.5;
  const tick = 4;
  const midX = (pair.from.x + pair.to.x) / 2;
  const midY = (pair.from.y + pair.to.y) / 2;
  return (
    <>
      <svg className="pixel-spacing" aria-hidden="true">
        <line x1={pair.from.x} y1={pair.from.y} x2={pair.to.x} y2={pair.to.y} />
        {[pair.from, pair.to].map((end, index) =>
          horizontal ? (
            <line key={index} x1={end.x} y1={end.y - tick} x2={end.x} y2={end.y + tick} />
          ) : (
            <line key={index} x1={end.x - tick} y1={end.y} x2={end.x + tick} y2={end.y} />
          ),
        )}
      </svg>
      <span className="pixel-spacing-label" style={{ left: midX, top: midY }} aria-hidden="true">
        {spacingLabel(inches)}
      </span>
    </>
  );
}

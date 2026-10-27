"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { layoutToSvgModel } from "../../lib/garden-layout";
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
  /** false draws every plant fully grown and still (e.g. a static sample). */
  animate?: boolean;
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
  onSwapZones,
  selectedPlantId = null,
  showTags = true,
  maxTile = 44,
  animate = true,
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
          const columns = Math.max(1, Math.floor(patch.width));
          const rows = Math.max(1, Math.floor(patch.height));
          const spriteCount = Math.min(MAX_SPRITES_PER_ZONE, columns * rows, Math.max(1, plant.quantity || 1));
          const selected = plant.id === selectedPlantId;
          return (
            <button
              type="button"
              key={patch.id}
              data-plant-id={plant.id}
              className={`pixel-zone${spriteCount === 1 ? " single" : ""}${selected ? " selected" : ""}${drag?.fromId === plant.id ? " drag-source" : ""}${drag?.overId === plant.id ? " drop-target" : ""}`}
              style={{
                left: patch.x * tile,
                top: patch.y * tile,
                width: patch.width * tile,
                height: patch.height * tile,
                gridTemplateColumns: `repeat(${Math.min(columns, spriteCount)}, 1fr)`,
              }}
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
              aria-label={`${plant.name}, ${plant.quantity} mature plants, ${startingAmountLabel(plant.name, plant.quantity)}`}
              title={`${plant.name}: ${plant.quantity} mature plants (${startingAmountLabel(plant.name, plant.quantity)}) · ${plant.spacingInches} in spacing · about ${Math.round(patch.width * 4) / 4} × ${Math.round(patch.height * 4) / 4} ft${plant.placementReason ? `\n${plant.placementReason}` : ""}`}
            >
              {Array.from({ length: spriteCount }, (_, index) => (
                <PixelSprite
                  key={index}
                  plantName={plant.name}
                  scale={spriteScale}
                  motion={animate ? "grow" : "still"}
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

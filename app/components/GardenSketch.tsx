"use client";

import rough from "roughjs";
import type { RoughSVG } from "roughjs/bin/svg";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FocusEvent, MouseEvent, PointerEvent } from "react";
import { layoutToSvgModel } from "../../lib/garden-layout";
import { layoutTableRows } from "../../lib/plan/view";
import { IDENTITY_VIEW, MAX_ZOOM, MIN_ZOOM, panBy, ZOOM_STEP, zoomAt } from "../../lib/sketch-zoom";
import { MAX_PLANT_QUANTITY } from "../../lib/planner-config";
import { SelectControl } from "./FormControls";
import type { AlternativesByBed, Bed, Garden, Layout, Plant, ZoomView } from "../../lib/types";

interface SketchColor {
  fill: string;
  stroke: string;
}

/** The parts of a layoutToSvgModel plant patch this component reads. */
interface SketchPatch {
  id: string;
  plantId: string;
  xPx: number;
  yPx: number;
  widthPx: number;
  heightPx: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  color: SketchColor;
}

interface SketchMarker {
  xPx: number;
  yPx: number;
  color: SketchColor;
}

interface SvgTextOptions {
  x: number;
  y: number;
  text: string;
  className?: string;
  fill?: string;
  fontSize?: number;
  anchor?: string;
}

interface SketchTooltip {
  left: number;
  top: number;
  title: string;
  target: string;
  spacing: string;
  section: string;
  reason: string;
}

interface Point {
  x: number;
  y: number;
}

type Gesture =
  | { type: "pinch"; distance: number; view: ZoomView }
  | { type: "zone"; plantId: string; start: Point; moved: boolean }
  | { type: "pan"; last: Point };

interface DragState {
  fromId: string;
  overId: string | null;
}

interface GardenSketchProps {
  layout: Layout;
  title?: string;
  onLayoutChange?: (layout: Layout) => void;
  onPlantSectionClick?: (guideId: string) => void;
  alternatives?: AlternativesByBed | null;
  onSwapPlant?: (plantId: string, plantName: string) => void;
  onSwapZones?: (firstId: string, secondId: string) => void;
}

const SVG_NS = "http://www.w3.org/2000/svg";
const ROUGHNESS = 0.5;

const SUN_ZONE_COLORS: Record<string, SketchColor & { label: string }> = {
  full_sun: { fill: "#f6d785", stroke: "#a97924", label: "Full sun (6+ hours)" },
  partial_shade: { fill: "#dce7bc", stroke: "#718249", label: "Partial shade (3–6 hours)" },
  shade: { fill: "#ccd9e8", stroke: "#627c94", label: "Mostly shade (under 3 hours)" },
};

function deepCloneLayout<T>(layout: T): T {
  return structuredClone(layout);
}

function newPlantId() {
  return `plant-${crypto.randomUUID()}`;
}

function cleanPlacementReason(value: string | undefined) {
  return String(value || "Fits this area's light and spacing.").trim();
}

function roundToQuarter(value: number) {
  return Math.round(value * 4) / 4;
}

function zoneLabelText(plant: Plant, patch: SketchPatch) {
  const maxCharacters = Math.floor((patch.widthPx - 12) / 6.5);
  if (maxCharacters < 5) {
    return "";
  }
  const fullLabel =
    patch.widthPx >= 115 ? `${plant.name} · ${plant.quantity || 1}` : plant.name;
  return fullLabel.length > maxCharacters
    ? `${fullLabel.slice(0, Math.max(3, maxCharacters - 1))}…`
    : fullLabel;
}

function appendSvgText(
  svg: SVGSVGElement,
  { x, y, text, className, fill = "#4e5e51", fontSize = 10, anchor = "start" }: SvgTextOptions,
) {
  const node = document.createElementNS(SVG_NS, "text");
  node.setAttribute("x", String(x));
  node.setAttribute("y", String(y));
  node.setAttribute("fill", fill);
  node.setAttribute("font-size", String(fontSize));
  node.setAttribute("font-family", "ui-rounded, 'Trebuchet MS', sans-serif");
  node.setAttribute("font-weight", "700");
  node.setAttribute("text-anchor", anchor);
  if (className) {
    node.setAttribute("class", className);
  }
  node.textContent = text;
  svg.appendChild(node);
}

function drawPlantGlyph(roughSvg: RoughSVG, marker: SketchMarker) {
  return [
    roughSvg.circle(marker.xPx, marker.yPx, 8.2, {
      fill: marker.color.fill,
      fillStyle: "solid",
      stroke: marker.color.stroke,
      strokeWidth: 1.1,
      roughness: ROUGHNESS,
    }),
    roughSvg.circle(marker.xPx, marker.yPx, 3.1, {
      fill: "#f7fbef",
      fillStyle: "solid",
      stroke: marker.color.stroke,
      strokeWidth: 0.8,
      roughness: ROUGHNESS,
    }),
    roughSvg.line(marker.xPx - 2.7, marker.yPx, marker.xPx + 2.7, marker.yPx, {
      stroke: marker.color.stroke,
      strokeWidth: 0.7,
      roughness: ROUGHNESS,
    }),
    roughSvg.line(marker.xPx, marker.yPx - 2.7, marker.xPx, marker.yPx + 2.7, {
      stroke: marker.color.stroke,
      strokeWidth: 0.7,
      roughness: ROUGHNESS,
    }),
  ];
}

function bedLabel(bed: Pick<Bed, "name" | "sunExposure" | "sunExposureLabel">, garden: Garden) {
  if (bed.sunExposureLabel || bed.sunExposure) {
    const exposure = bed.sunExposureLabel || bed.sunExposure || "";
    const friendlyExposure =
      exposure === "mostly_shade"
        ? SUN_ZONE_COLORS.shade.label
        : SUN_ZONE_COLORS[exposure]?.label || exposure;
    return `${bed.name} · ${friendlyExposure}`;
  }
  if (garden.sunniestSide === "fully_shaded") {
    return `${bed.name} · Fully shaded`;
  }
  if (garden.sunniestSide) {
    return `${bed.name} · Most sun: ${garden.sunniestSide}`;
  }
  return bed.name;
}

export default function GardenSketch({
  layout,
  title = "Interactive Sketch",
  onLayoutChange,
  onPlantSectionClick,
  alternatives = null,
  onSwapPlant,
  onSwapZones,
}: GardenSketchProps) {
  const [localLayout, setLocalLayout] = useState(() => deepCloneLayout(layout));
  const [tooltip, setTooltip] = useState<SketchTooltip | null>(null);
  const [templateCatalog, setTemplateCatalog] = useState(() =>
    deepCloneLayout(layout.plants || []),
  );
  const [newPlantName, setNewPlantName] = useState(layout.plants?.[0]?.name || "");
  const [newPlantBedId, setNewPlantBedId] = useState(layout.beds?.[0]?.id || "");
  const [newPlantQuantity, setNewPlantQuantity] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [view, setView] = useState<ZoomView>(IDENTITY_VIEW);
  const [drag, setDrag] = useState<DragState | null>(null);
  const zoomLayerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef(view);
  const pointersRef = useRef(new Map<number, Point>());
  const gestureRef = useRef<Gesture | null>(null);

  const baseSvgRef = useRef<SVGSVGElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const latestLayoutRef = useRef(localLayout);

  useEffect(() => {
    const cloned = deepCloneLayout(layout);
    latestLayoutRef.current = cloned;
    setLocalLayout(cloned);
    setTooltip(null);
    setTemplateCatalog((previous) => {
      const byName = new Map(previous.map((plant) => [plant.name.toLowerCase(), plant]));
      (layout.plants || []).forEach((plant) => {
        if (!byName.has(plant.name.toLowerCase())) {
          byName.set(plant.name.toLowerCase(), deepCloneLayout(plant));
        }
      });
      return [...byName.values()];
    });
    setNewPlantName((previous) => previous || layout.plants?.[0]?.name || "");
    setNewPlantBedId((previous) =>
      layout.beds?.some((bed) => bed.id === previous)
        ? previous
        : layout.beds?.[0]?.id || "",
    );
  }, [layout]);

  const model = useMemo(() => layoutToSvgModel(localLayout), [localLayout]);
  const tableRows = useMemo(() => layoutTableRows(localLayout), [localLayout]);
  const plantsById = useMemo(
    () => new Map(localLayout.plants.map((plant) => [plant.id, plant])),
    [localLayout.plants],
  );
  const bedsById = useMemo(
    () => new Map(localLayout.beds.map((bed) => [bed.id, bed])),
    [localLayout.beds],
  );
  const templateOptions = useMemo(
    () => templateCatalog.map((plant) => ({ value: plant.name, label: plant.name })),
    [templateCatalog],
  );
  const bedOptions = useMemo(
    () => localLayout.beds.map((bed) => ({ value: bed.id, label: bed.name })),
    [localLayout.beds],
  );

  useEffect(() => {
    if (!baseSvgRef.current) {
      return;
    }

    const svg = baseSvgRef.current;
    svg.innerHTML = "";
    const roughSvg = rough.svg(svg);
    if (localLayout.garden.sunniestSide) {
      appendSvgText(svg, {
        x: model.viewWidth - model.padding - 5,
        y: model.padding - 7,
        text: "N ↑",
        fill: "#2f5134",
        fontSize: 11,
        anchor: "end",
      });
    }

    model.beds.forEach((bed) => {
      const options = {
        fill: "#faf8f0",
        fillStyle: "solid",
        stroke: "#37342e",
        strokeWidth: 2.1,
        roughness: ROUGHNESS,
      };
      const shape =
        bed.shape === "circle"
          ? roughSvg.circle(bed.cxPx, bed.cyPx, bed.rPx * 2, options)
          : roughSvg.rectangle(bed.xPx, bed.yPx, bed.widthPx, bed.heightPx, options);
      svg.appendChild(shape);
    });

    model.plantPatches.forEach((patch) => {
      const zoneShape = roughSvg.rectangle(
        patch.xPx,
        patch.yPx,
        patch.widthPx,
        patch.heightPx,
        {
          fill: patch.color.fill,
          fillStyle: "solid",
          stroke: patch.color.stroke,
          roughness: ROUGHNESS,
          strokeWidth: 1.35,
        },
      );
      zoneShape.setAttribute("opacity", "0.72");
      svg.appendChild(zoneShape);
    });

    model.plantMarkers.forEach((marker) => {
      drawPlantGlyph(roughSvg, marker).forEach((node) => svg.appendChild(node));
    });

    model.beds.forEach((bed) => {
      appendSvgText(svg, {
        x: bed.xPx + 3,
        y: bed.yPx - 6,
        text: bedLabel(bed, localLayout.garden),
        className: "bed-label",
        fill: "#2f2d29",
        fontSize: 12,
      });
      appendSvgText(svg, {
        x: bed.xPx + bed.widthPx - 7,
        y: bed.yPx + bed.heightPx - 7,
        text: `${bed.width} × ${bed.height} ft`,
        className: "bed-dimension-label",
        fill: "#2f4633",
        fontSize: 11,
        anchor: "end",
      });
    });
  }, [localLayout.garden, model]);

  function commitLayout(nextLayout: Layout) {
    latestLayoutRef.current = nextLayout;
    setLocalLayout(nextLayout);
    setTooltip(null);
    onLayoutChange?.(nextLayout);
  }

  // Manual edits release a bed's locked zone shares so quantities rebalance its space again.
  function releaseZoneShares(next: Layout, bedId: string) {
    next.plants.forEach((item) => {
      if (item.bedId === bedId) {
        delete item.areaShare;
      }
    });
  }

  function adjustPlantQuantity(plantId: string, amount: number) {
    const next = deepCloneLayout(latestLayoutRef.current);
    const plant = next.plants.find((item) => item.id === plantId);
    if (!plant) {
      return;
    }
    releaseZoneShares(next, plant.bedId);
    const quantity = Math.min(MAX_PLANT_QUANTITY, (Number(plant.quantity) || 1) + amount);
    if (quantity <= 0) {
      next.plants = next.plants.filter((item) => item.id !== plantId);
    } else {
      plant.quantity = quantity;
    }
    commitLayout(next);
  }

  function addPlantGroup() {
    const template = templateCatalog.find((plant) => plant.name === newPlantName);
    const bed = localLayout.beds.find((item) => item.id === newPlantBedId);
    if (!template || !bed) {
      return;
    }

    const next = deepCloneLayout(latestLayoutRef.current);
    releaseZoneShares(next, bed.id);
    const existing = next.plants.find(
      (plant) => plant.name === newPlantName && plant.bedId === newPlantBedId,
    );
    const quantity = Math.max(1, Math.min(MAX_PLANT_QUANTITY, Math.floor(Number(newPlantQuantity) || 1)));
    if (existing) {
      existing.quantity = Math.min(MAX_PLANT_QUANTITY, (Number(existing.quantity) || 1) + quantity);
    } else {
      next.plants.push({
        ...deepCloneLayout(template),
        id: newPlantId(),
        bedId: bed.id,
        x: Math.round((bed.x + bed.width / 2) * 100) / 100,
        y: Math.round((bed.y + bed.height / 2) * 100) / 100,
        quantity,
        placementReason: `Added to ${bed.name} by the gardener.`,
      });
    }
    commitLayout(next);
  }

  function showPlantTooltip(
    event: MouseEvent<SVGRectElement> | FocusEvent<SVGRectElement>,
    plant: Plant,
    patch: SketchPatch,
  ) {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const rect = stage.getBoundingClientRect();
    const canvasRect = baseSvgRef.current?.getBoundingClientRect() || rect;
    const scaleX = canvasRect.width / model.widthPx;
    const scaleY = canvasRect.height / model.heightPx;
    const tooltipWidth = 280;
    // Focus events carry no pointer position, so they fall back to the patch center.
    const pointer = "clientX" in event ? event : null;
    const clientX = Number.isFinite(pointer?.clientX)
      ? (pointer?.clientX ?? 0)
      : canvasRect.left + patch.centerX * scaleX;
    const clientY = Number.isFinite(pointer?.clientY)
      ? (pointer?.clientY ?? 0)
      : canvasRect.top + patch.centerY * scaleY;
    const left = Math.max(
      8,
      Math.min(
        stage.clientWidth - tooltipWidth - 8,
        clientX - rect.left + 14,
      ),
    );
    const top = Math.max(
      8,
      Math.min(canvasRect.height - 132, clientY - rect.top + 14),
    );
    setTooltip({
      left,
      top,
      title: plant.name,
      target: `${plant.quantity || 1} mature ${plant.quantity === 1 ? "plant" : "plants"}`,
      spacing: `${plant.spacingInches || "?"} in spacing`,
      section: `About ${roundToQuarter(patch.width)} × ${roundToQuarter(patch.height)} ft`,
      reason: cleanPlacementReason(plant.placementReason),
    });
  }

  function layerSize() {
    const layer = zoomLayerRef.current;
    return { width: layer?.offsetWidth || 1, height: layer?.offsetHeight || 1 };
  }

  function applyView(next: ZoomView) {
    viewRef.current = next;
    setView(next);
  }

  function zoomBy(factor: number, focal?: Point) {
    const { width, height } = layerSize();
    const point = focal || { x: width / 2, y: height / 2 };
    applyView(zoomAt(viewRef.current, viewRef.current.scale * factor, point, width, height));
  }

  function stagePoint(event: { clientX: number; clientY: number }): Point {
    const rect = (stageRef.current as HTMLDivElement).getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function plantIdFrom(target: EventTarget | null): string | null {
    if (!(target instanceof Element)) {
      return null;
    }
    const zone = target.closest("[data-plant-id]");
    return zone instanceof SVGElement || zone instanceof HTMLElement ? zone.dataset.plantId || null : null;
  }

  function plantIdAt(clientX: number, clientY: number) {
    return plantIdFrom(document.elementFromPoint(clientX, clientY));
  }

  // One handler set covers zone drag-to-swap, panning, and two-finger pinch zoom.
  function handleStagePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 && event.pointerType === "mouse") {
      return;
    }
    pointersRef.current.set(event.pointerId, stagePoint(event));
    const points = [...pointersRef.current.values()];

    if (points.length === 2) {
      const [a, b] = points;
      gestureRef.current = {
        type: "pinch",
        distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        view: viewRef.current,
      };
      setDrag(null);
      return;
    }

    const plantId = plantIdFrom(event.target);
    if (plantId) {
      gestureRef.current = { type: "zone", plantId, start: stagePoint(event), moved: false };
    } else if (viewRef.current.scale > MIN_ZOOM) {
      gestureRef.current = { type: "pan", last: stagePoint(event) };
    } else {
      gestureRef.current = null;
      return;
    }
    stageRef.current?.setPointerCapture?.(event.pointerId);
  }

  function handleStagePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) {
      return;
    }
    const point = stagePoint(event);
    pointersRef.current.set(event.pointerId, point);
    const gesture = gestureRef.current;
    if (!gesture) {
      return;
    }
    const { width, height } = layerSize();

    if (gesture.type === "pinch") {
      const [a, b] = [...pointersRef.current.values()];
      if (!b) {
        return;
      }
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      applyView(zoomAt(gesture.view, gesture.view.scale * (distance / gesture.distance), mid, width, height));
    } else if (gesture.type === "pan") {
      applyView(panBy(viewRef.current, point.x - gesture.last.x, point.y - gesture.last.y, width, height));
      gesture.last = point;
    } else if (gesture.type === "zone") {
      if (!gesture.moved && Math.hypot(point.x - gesture.start.x, point.y - gesture.start.y) > 6) {
        gesture.moved = true;
        setTooltip(null);
      }
      if (gesture.moved) {
        const overId = plantIdAt(event.clientX, event.clientY);
        setDrag({ fromId: gesture.plantId, overId: overId !== gesture.plantId ? overId : null });
      }
    }
  }

  function handleStagePointerUp(event: PointerEvent<HTMLDivElement>) {
    pointersRef.current.delete(event.pointerId);
    const gesture = gestureRef.current;
    if (gesture?.type === "zone" && event.type === "pointerup") {
      const plant = plantsById.get(gesture.plantId);
      if (!gesture.moved) {
        if (plant) {
          openGuide(plant);
        }
      } else {
        const overId = plantIdAt(event.clientX, event.clientY);
        if (overId && overId !== gesture.plantId) {
          onSwapZones?.(gesture.plantId, overId);
        }
      }
    }
    if (pointersRef.current.size === 0 || gesture?.type !== "pinch") {
      gestureRef.current = null;
    }
    setDrag(null);
  }

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) {
      return undefined;
    }
    // Non-passive so Ctrl/⌘ + scroll (and trackpad pinch) zooms the sketch, not the page.
    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) {
        return;
      }
      event.preventDefault();
      const rect = (stage as HTMLDivElement).getBoundingClientRect();
      zoomBy(event.deltaY < 0 ? 1.1 : 1 / 1.1, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    }
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  });

  function openGuide(plant: Plant) {
    onPlantSectionClick?.(
      plant.guideId || `guide-${plant.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    );
  }

  return (
    <div className="garden-sketch-wrap">
      <div className="garden-sketch-toolbar">
        <h3>{title}</h3>
        <span>Hover for details</span>
      </div>

      <div className="garden-sketch-editor no-print">
        <div className="garden-sketch-editor-heading">
          <div>
            <strong>Edit plant groups</strong>
            <span>Pick a different plant for any group, or use the controls to rebalance how much space each plant receives.</span>
          </div>
        </div>

        <div className="plant-group-adjustments">
          {localLayout.plants.map((plant) => (
            <div className="plant-group-adjustment" key={plant.id}>
              <div>
                {alternatives?.[plant.bedId]?.length && onSwapPlant ? (
                  <SelectControl
                    id={`swap-${plant.id}`}
                    value={plant.name}
                    onValueChange={(name) => {
                      if (name !== plant.name) {
                        onSwapPlant(plant.id, name);
                      }
                    }}
                    options={[
                      { value: plant.name, label: plant.name },
                      ...alternatives[plant.bedId]
                        .filter((item) => item.name !== plant.name)
                        .map((item) => ({ value: item.name, label: `${item.name} — ${item.reason}` })),
                    ]}
                    ariaLabel={`Swap ${plant.name} in ${bedsById.get(plant.bedId)?.name || "this area"}`}
                  />
                ) : (
                  <strong>{plant.name}</strong>
                )}
                <span>{bedsById.get(plant.bedId)?.name || "Growing area"}</span>
              </div>
              <div className="quantity-stepper" aria-label={`${plant.name} target quantity`}>
                <button
                  type="button"
                  onClick={() => adjustPlantQuantity(plant.id, -1)}
                  aria-label={`Decrease ${plant.name}`}
                >
                  −
                </button>
                <output>{plant.quantity || 1}</output>
                <button
                  type="button"
                  onClick={() => adjustPlantQuantity(plant.id, 1)}
                  aria-label={`Increase ${plant.name}`}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="garden-sketch-editor-fields">
          <div className="sketch-editor-field">
            <label htmlFor="sketch-add-plant">Plant</label>
            <SelectControl
              id="sketch-add-plant"
              value={newPlantName}
              onValueChange={setNewPlantName}
              options={templateOptions}
              placeholder="Choose a plant"
            />
          </div>
          <div className="sketch-editor-field">
            <label htmlFor="sketch-add-bed">Growing area</label>
            <SelectControl
              id="sketch-add-bed"
              value={newPlantBedId}
              onValueChange={setNewPlantBedId}
              options={bedOptions}
              placeholder="Choose an area"
            />
          </div>
          <div className="sketch-editor-field">
            <label>Starting quantity</label>
            <div className="quantity-stepper new-group-stepper">
              <button
                type="button"
                onClick={() => setNewPlantQuantity((value) => Math.max(1, value - 1))}
                aria-label="Decrease starting quantity"
              >
                −
              </button>
              <output>{newPlantQuantity}</output>
              <button
                type="button"
                onClick={() => setNewPlantQuantity((value) => Math.min(MAX_PLANT_QUANTITY, value + 1))}
                aria-label="Increase starting quantity"
              >
                +
              </button>
            </div>
          </div>
          <button type="button" className="sketch-add-btn" onClick={addPlantGroup}>
            + Add group
          </button>
        </div>
      </div>

      <div className="sun-color-key" aria-label="Plant sunlight color key">
        {Object.entries(SUN_ZONE_COLORS).map(([key, value]) => (
          <span key={key}>
            <i style={{ backgroundColor: value.fill, borderColor: value.stroke }} />
            {value.label}
          </span>
        ))}
      </div>

      <div className="garden-sketch-view-toggles no-print">
        <button
          type="button"
          className="sketch-toggle"
          aria-pressed={showGrid}
          onClick={() => setShowGrid((value) => !value)}
        >
          Show 1 ft grid
        </button>
        <button
          type="button"
          className="sketch-toggle"
          aria-pressed={showTable}
          aria-controls="garden-layout-table"
          onClick={() => setShowTable((value) => !value)}
        >
          View as table
        </button>
        <div className="sketch-zoom-controls" role="group" aria-label="Sketch zoom">
          <button
            type="button"
            className="sketch-toggle"
            onClick={() => zoomBy(1 / ZOOM_STEP)}
            disabled={view.scale <= MIN_ZOOM}
            aria-label="Zoom out"
          >
            −
          </button>
          <output aria-live="polite">{Math.round(view.scale * 100)}%</output>
          <button
            type="button"
            className="sketch-toggle"
            onClick={() => zoomBy(ZOOM_STEP)}
            disabled={view.scale >= MAX_ZOOM}
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            className="sketch-toggle"
            onClick={() => applyView(IDENTITY_VIEW)}
            disabled={view.scale === MIN_ZOOM}
          >
            Reset
          </button>
        </div>
      </div>
      <p className="sketch-drag-hint no-print">
        {onSwapZones ? "Drag a plant zone onto another to swap them. " : ""}
        Pinch or Ctrl/⌘ + scroll to zoom.
      </p>

      <div
        className={`garden-sketch-stage${view.scale > MIN_ZOOM ? " zoomed" : ""}${drag ? " dragging" : ""}`}
        ref={stageRef}
        style={{ touchAction: view.scale > MIN_ZOOM ? "none" : "pan-x pan-y" }}
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={handleStagePointerUp}
      >
        <div
          className="garden-sketch-zoom-layer"
          ref={zoomLayerRef}
          style={{
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
            transformOrigin: "0 0",
          }}
        >
          <svg
            viewBox={model.viewBox}
            width={model.widthPx}
            height={model.heightPx}
            ref={baseSvgRef}
            className="garden-sketch-svg"
            role="img"
            aria-label="Garden sketch with proportional planting areas"
          />
          <svg
            viewBox={model.viewBox}
            width={model.widthPx}
            height={model.heightPx}
            className="garden-sketch-overlay"
            onMouseLeave={() => setTooltip(null)}
          >
            {showGrid ? (
              <g className="sqft-grid no-print" pointerEvents="none" aria-hidden="true">
                {model.beds.map((bed) => {
                  const step = model.pixelsPerFoot;
                  const clipId = `grid-clip-${bed.id}`;
                  const vertical = Array.from({ length: Math.max(0, Math.ceil(bed.width) - 1) }, (_, index) => bed.xPx + (index + 1) * step);
                  const horizontal = Array.from({ length: Math.max(0, Math.ceil(bed.height) - 1) }, (_, index) => bed.yPx + (index + 1) * step);
                  return (
                    <g key={`grid-${bed.id}`} clipPath={`url(#${clipId})`}>
                      <clipPath id={clipId}>
                        {bed.shape === "circle" ? (
                          <circle cx={bed.cxPx} cy={bed.cyPx} r={bed.rPx} />
                        ) : (
                          <rect x={bed.xPx} y={bed.yPx} width={bed.widthPx} height={bed.heightPx} />
                        )}
                      </clipPath>
                      {vertical.map((x) => (
                        <line key={`v-${x}`} x1={x} x2={x} y1={bed.yPx} y2={bed.yPx + bed.heightPx} />
                      ))}
                      {horizontal.map((y) => (
                        <line key={`h-${y}`} x1={bed.xPx} x2={bed.xPx + bed.widthPx} y1={y} y2={y} />
                      ))}
                    </g>
                  );
                })}
              </g>
            ) : null}
            {model.plantPatches.map((patch) => {
              const plant = plantsById.get(patch.plantId);
              if (!plant) {
                return null;
              }
              const zoneLabel = zoneLabelText(plant, patch);
              return (
                <g key={`hot-${patch.id}`}>
                  <rect
                    className={`patch-hit${drag?.fromId === plant.id ? " drag-source" : ""}${drag?.overId === plant.id ? " drop-target" : ""}`}
                    data-plant-id={plant.id}
                    x={patch.xPx}
                    y={patch.yPx}
                    width={patch.widthPx}
                    height={patch.heightPx}
                    tabIndex={0}
                    role="button"
                    aria-label={`${plant.name}, ${plant.quantity || 1} mature plants, about ${roundToQuarter(patch.width)} by ${roundToQuarter(patch.height)} feet`}
                    onMouseEnter={(event) => showPlantTooltip(event, plant, patch)}
                    onMouseMove={(event) => showPlantTooltip(event, plant, patch)}
                    onFocus={(event) => showPlantTooltip(event, plant, patch)}
                    onBlur={() => setTooltip(null)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openGuide(plant);
                      }
                    }}
                  />
                  {zoneLabel ? (
                    <text
                      className="plant-zone-label"
                      x={patch.xPx + 7}
                      y={patch.yPx + 15}
                    >
                      {zoneLabel}
                    </text>
                  ) : null}
                </g>
              );
            })}
          </svg>
        </div>

        {tooltip ? (
          <div
            className="garden-zone-tooltip no-print"
            role="tooltip"
            style={{ left: tooltip.left, top: tooltip.top }}
          >
            <strong>{tooltip.title}</strong>
            <span>{tooltip.target} · {tooltip.spacing}</span>
            <span>{tooltip.section}</span>
            <p>{tooltip.reason}</p>
          </div>
        ) : null}
      </div>

      {showTable ? (
        <div className="garden-layout-table-wrap no-print">
          <table id="garden-layout-table" className="garden-layout-table">
            <caption>Garden layout by plant group</caption>
            <thead>
              <tr>
                <th scope="col">Growing area</th>
                <th scope="col">Plant</th>
                <th scope="col">Quantity</th>
                <th scope="col">Spacing (in)</th>
                <th scope="col">Allocated size (ft)</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.area}</td>
                  <th scope="row">{row.plant}</th>
                  <td>{row.quantity}</td>
                  <td>{row.spacingInches}</td>
                  <td>{row.size}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="garden-sketch-meta">
        <span>
          {localLayout.garden.gardenTypeKey === "in_ground" ? "Plot size" : "Sketch footprint"}: {localLayout.garden.width} × {localLayout.garden.height} ft
        </span>
        <span>{localLayout.beds.length} growing {localLayout.beds.length === 1 ? "area" : "areas"}</span>
        <span>{localLayout.plants.length} plant groups</span>
      </div>
    </div>
  );
}

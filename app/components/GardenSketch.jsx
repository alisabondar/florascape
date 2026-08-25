"use client";

import rough from "roughjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { layoutToSvgModel } from "../../lib/garden-layout";

const SVG_NS = "http://www.w3.org/2000/svg";

const SUN_ZONE_COLORS = {
  full_sun: { fill: "#f6d785", stroke: "#c59a43", label: "FULL SUN" },
  partial_shade: { fill: "#dce7bc", stroke: "#8d9b63", label: "PARTIAL SHADE" },
  shade: { fill: "#ccd9e8", stroke: "#6f879d", label: "SHADE" },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function deepCloneLayout(layout) {
  return JSON.parse(JSON.stringify(layout));
}

function newPlantId() {
  return `plant-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function displaySunNeed(value) {
  if (!value) {
    return "Unknown";
  }
  return String(value).replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function appendSvgText(
  svg,
  { x, y, text, className, fill = "#4e5e51", fontSize = 10, anchor = "start", opacity = 1 },
) {
  const node = document.createElementNS(SVG_NS, "text");
  node.setAttribute("x", String(x));
  node.setAttribute("y", String(y));
  node.setAttribute("fill", fill);
  node.setAttribute("font-size", String(fontSize));
  node.setAttribute("font-family", "ui-rounded, 'Trebuchet MS', sans-serif");
  node.setAttribute("font-weight", "600");
  node.setAttribute("text-anchor", anchor);
  node.setAttribute("opacity", String(opacity));
  if (className) {
    node.setAttribute("class", className);
  }
  node.textContent = text;
  svg.appendChild(node);
}

function drawPlantGlyph(roughSvg, marker) {
  const outer = roughSvg.circle(marker.xPx, marker.yPx, 8.2, {
    fill: marker.color.fill,
    fillStyle: "solid",
    stroke: marker.color.stroke,
    strokeWidth: 1.1,
    roughness: 1.3,
  });
  const inner = roughSvg.circle(marker.xPx, marker.yPx, 3.1, {
    fill: "#f7fbef",
    fillStyle: "solid",
    stroke: marker.color.stroke,
    strokeWidth: 0.8,
    roughness: 1.2,
  });
  const stemA = roughSvg.line(marker.xPx - 2.7, marker.yPx, marker.xPx + 2.7, marker.yPx, {
    stroke: marker.color.stroke,
    strokeWidth: 0.7,
    roughness: 1.3,
  });
  const stemB = roughSvg.line(marker.xPx, marker.yPx - 2.7, marker.xPx, marker.yPx + 2.7, {
    stroke: marker.color.stroke,
    strokeWidth: 0.7,
    roughness: 1.3,
  });

  return [outer, inner, stemA, stemB];
}

function drawSunburstRectRays(roughSvg, { x, y, width, height, stroke }) {
  const rays = [];
  const cx = x + width / 2;
  const cy = y + height / 2;
  const count = 16;

  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    const tx =
      dx > 0 ? (x + width - cx) / dx : dx < 0 ? (x - cx) / dx : Number.POSITIVE_INFINITY;
    const ty =
      dy > 0 ? (y + height - cy) / dy : dy < 0 ? (y - cy) / dy : Number.POSITIVE_INFINITY;

    const t = Math.min(Math.abs(tx), Math.abs(ty));
    if (!Number.isFinite(t)) {
      continue;
    }

    const x2 = cx + dx * t * 0.9;
    const y2 = cy + dy * t * 0.9;
    rays.push(
      roughSvg.line(cx, cy, x2, y2, {
        stroke,
        strokeWidth: 0.85,
        roughness: 1.15,
      }),
    );
  }

  return rays;
}

function drawSunburstCircleRays(roughSvg, { cx, cy, radius, stroke }) {
  const rays = [];
  const count = 14;

  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const x2 = cx + Math.cos(angle) * radius * 0.92;
    const y2 = cy + Math.sin(angle) * radius * 0.92;
    rays.push(
      roughSvg.line(cx, cy, x2, y2, {
        stroke,
        strokeWidth: 0.85,
        roughness: 1.15,
      }),
    );
  }

  return rays;
}

function SelectedOverlay({ model, selected }) {
  if (!selected) {
    return null;
  }

  if (selected.type === "bed") {
    const bed = model.beds.find((item) => item.id === selected.id);
    if (!bed) {
      return null;
    }
    if (bed.shape === "circle") {
      return (
        <circle
          cx={bed.cxPx}
          cy={bed.cyPx}
          r={Math.max(0, bed.rPx - 2)}
          fill="none"
          stroke="#d08a27"
          strokeWidth={3}
        />
      );
    }
    return (
      <rect
        x={bed.xPx}
        y={bed.yPx}
        width={bed.widthPx}
        height={bed.heightPx}
        fill="none"
        stroke="#d08a27"
        strokeWidth={3}
        rx={6}
      />
    );
  }

  if (selected.type === "plant") {
    const plant = model.plants.find((item) => item.id === selected.id);
    if (!plant) {
      return null;
    }
    return (
      <circle
        cx={plant.xPx}
        cy={plant.yPx}
        r={12}
        fill="none"
        stroke="#d08a27"
        strokeWidth={3}
      />
    );
  }

  return null;
}

function bedLabelPosition(bed) {
  if (bed.shape === "circle") {
    return {
      x: bed.cxPx,
      y: bed.cyPx + 4,
      anchor: "middle",
      className: "bed-label bed-label-center",
    };
  }
  if (bed.width >= 2.6 && bed.height >= 2.2) {
    return {
      x: bed.xPx + bed.widthPx / 2,
      y: bed.yPx + bed.heightPx / 2 + 4,
      anchor: "middle",
      className: "bed-label bed-label-center",
    };
  }
  return { x: bed.xPx + 8, y: bed.yPx + 16, anchor: "start", className: "bed-label" };
}

export default function GardenSketch({
  layout,
  title = "Interactive Sketch",
  onLayoutChange,
}) {
  const [localLayout, setLocalLayout] = useState(() => deepCloneLayout(layout));
  const [selected, setSelected] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [showPlantLabels, setShowPlantLabels] = useState(true);
  const [showSunZones, setShowSunZones] = useState(false);
  const [draggingPlantId, setDraggingPlantId] = useState(null);
  const [plantClipboard, setPlantClipboard] = useState(null);
  const [hoveredSection, setHoveredSection] = useState(null);

  const baseSvgRef = useRef(null);
  const overlayRef = useRef(null);
  const latestLayoutRef = useRef(localLayout);
  const baseLayoutRef = useRef(layout);

  useEffect(() => {
    const cloned = deepCloneLayout(layout);
    baseLayoutRef.current = cloned;
    latestLayoutRef.current = cloned;
    setLocalLayout(cloned);
    setSelected(null);
    setHoveredSection(null);
  }, [layout]);

  useEffect(() => {
    latestLayoutRef.current = localLayout;
  }, [localLayout]);

  const model = useMemo(() => layoutToSvgModel(localLayout), [localLayout]);
  const plantsById = useMemo(
    () => new Map(localLayout.plants.map((plant) => [plant.id, plant])),
    [localLayout.plants],
  );
  const bedsById = useMemo(
    () => new Map(localLayout.beds.map((bed) => [bed.id, bed])),
    [localLayout.beds],
  );

  useEffect(() => {
    if (!baseSvgRef.current) {
      return;
    }

    const svg = baseSvgRef.current;
    svg.innerHTML = "";

    const roughSvg = rough.svg(svg);

    if (showSunZones) {
      model.sunZones.forEach((zone) => {
        const zoneStyle = SUN_ZONE_COLORS[zone.level] || SUN_ZONE_COLORS.partial_shade;
        const zoneShape = roughSvg.rectangle(zone.xPx, zone.yPx, zone.widthPx, zone.heightPx, {
          fill: zoneStyle.fill,
          fillStyle: "solid",
          stroke: zoneStyle.stroke,
          strokeWidth: 1.15,
          roughness: 1.15,
        });
        zoneShape.setAttribute("opacity", "0.2");
        svg.appendChild(zoneShape);

        if (zone.level === "full_sun") {
          const rays = drawSunburstRectRays(roughSvg, {
            x: zone.xPx,
            y: zone.yPx,
            width: zone.widthPx,
            height: zone.heightPx,
            stroke: zoneStyle.stroke,
          });
          rays.forEach((ray) => {
            ray.setAttribute("opacity", "0.18");
            svg.appendChild(ray);
          });
        }

        appendSvgText(svg, {
          x: zone.xPx + zone.widthPx / 2,
          y: zone.yPx + 16,
          text: zoneStyle.label,
          fill: zoneStyle.stroke,
          fontSize: 10,
          anchor: "middle",
          opacity: 0.85,
        });
      });
    }

    model.paths.forEach((path) => {
      const pathBase = roughSvg.line(path.x1Px, path.y1Px, path.x2Px, path.y2Px, {
        stroke: "#9f9483",
        strokeWidth: path.widthPx + 3,
        roughness: 1.1,
      });
      pathBase.setAttribute("opacity", "0.55");
      svg.appendChild(pathBase);

      const pathCore = roughSvg.line(path.x1Px, path.y1Px, path.x2Px, path.y2Px, {
        stroke: "#807462",
        strokeWidth: Math.max(3, path.widthPx * 0.62),
        roughness: 1.2,
      });
      pathCore.setAttribute("opacity", "0.62");
      svg.appendChild(pathCore);
    });

    model.beds.forEach((bed) => {
      const sketchOptions = {
        fill: "#faf8f0",
        fillStyle: "solid",
        stroke: "#37342e",
        strokeWidth: 2.1,
        roughness: 1.45,
      };

      if (bed.shape === "circle") {
        const circle = roughSvg.circle(bed.cxPx, bed.cyPx, bed.rPx * 2, sketchOptions);
        svg.appendChild(circle);
      } else {
        const rect = roughSvg.rectangle(
          bed.xPx,
          bed.yPx,
          bed.widthPx,
          bed.heightPx,
          sketchOptions,
        );
        svg.appendChild(rect);
      }
    });

    model.plantPatches.forEach((patch) => {
      const options = {
        fill: patch.color.fill,
        fillStyle: "solid",
        stroke: patch.color.stroke,
        roughness: 1.2,
        strokeWidth: 1.2,
      };

      const centerX = patch.xPx + patch.widthPx / 2;
      const centerY = patch.yPx + patch.heightPx / 2;
      const radius = Math.min(patch.widthPx, patch.heightPx) / 2;

      const patchShape =
        patch.shape === "circle"
          ? roughSvg.circle(centerX, centerY, radius * 2, options)
          : roughSvg.rectangle(patch.xPx, patch.yPx, patch.widthPx, patch.heightPx, options);

      patchShape.setAttribute("opacity", "0.52");
      svg.appendChild(patchShape);

      if (patch.pattern === "sunburst") {
        const rays =
          patch.shape === "circle"
            ? drawSunburstCircleRays(roughSvg, {
                cx: centerX,
                cy: centerY,
                radius,
                stroke: patch.color.stroke,
              })
            : drawSunburstRectRays(roughSvg, {
                x: patch.xPx,
                y: patch.yPx,
                width: patch.widthPx,
                height: patch.heightPx,
                stroke: patch.color.stroke,
              });
        rays.forEach((ray) => {
          ray.setAttribute("opacity", "0.65");
          svg.appendChild(ray);
        });
      }
    });

    model.plantMarkers.forEach((marker) => {
      const glyph = drawPlantGlyph(roughSvg, marker);
      glyph.forEach((node) => svg.appendChild(node));
    });

    const postSize = 8;
    const corners = [
      { x: model.padding / 2, y: model.padding / 2 },
      { x: model.widthPx - model.padding / 2 - postSize, y: model.padding / 2 },
      { x: model.padding / 2, y: model.heightPx - model.padding / 2 - postSize },
      {
        x: model.widthPx - model.padding / 2 - postSize,
        y: model.heightPx - model.padding / 2 - postSize,
      },
    ];
    corners.forEach((corner) => {
      const post = roughSvg.rectangle(corner.x, corner.y, postSize, postSize, {
        fill: "#c5b79f",
        fillStyle: "solid",
        stroke: "#675c4a",
        roughness: 1.1,
      });
      svg.appendChild(post);
    });
  }, [model, showSunZones]);

  const selectedPlant =
    selected?.type === "plant"
      ? localLayout.plants.find((item) => item.id === selected.id)
      : null;
  const selectedBed =
    selected?.type === "bed" ? localLayout.beds.find((item) => item.id === selected.id) : null;

  function setBedHover(bed) {
    setHoveredSection({
      title: bed.name,
      subtitle: "Garden Area",
      details: `${bed.width} x ${bed.height} ft • ${bed.shape === "circle" ? "Circle" : "Square"}`,
    });
  }

  function setPlantHover(plant) {
    const bed = bedsById.get(plant.bedId);
    const styleLabel =
      plant.sunNeeds === "full_sun"
        ? "Sunburst circle area"
        : plant.renderStyle === "patch" || (plant.quantity || 1) >= 12
          ? "Solid patch area"
          : "Icon cluster area";

    setHoveredSection({
      title: plant.name,
      subtitle: `In ${bed?.name || "Bed"}`,
      details: `Qty ${plant.quantity || 1} • ${displaySunNeed(plant.sunNeeds)} • ${styleLabel}`,
    });
  }

  function setSunZoneHover(zone) {
    const zoneStyle = SUN_ZONE_COLORS[zone.level] || SUN_ZONE_COLORS.partial_shade;
    setHoveredSection({
      title: zoneStyle.label,
      subtitle: "Sun Exposure Zone",
      details: `${zone.width} x ${zone.height} ft`,
    });
  }

  function pointEventToFeet(event) {
    if (!overlayRef.current) {
      return null;
    }
    const rect = overlayRef.current.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return null;
    }

    const svgX = ((event.clientX - rect.left) / rect.width) * model.viewWidth;
    const svgY = ((event.clientY - rect.top) / rect.height) * model.viewHeight;

    const xFt = (svgX - model.padding) / model.pxPerFt;
    const yFt = (svgY - model.padding) / model.pxPerFt;

    return { xFt, yFt };
  }

  function updatePlantPosition(plantId, xFt, yFt) {
    setLocalLayout((prev) => {
      const next = deepCloneLayout(prev);
      const plant = next.plants.find((item) => item.id === plantId);
      if (!plant) {
        return prev;
      }
      const bed = next.beds.find((item) => item.id === plant.bedId);
      if (!bed) {
        return prev;
      }

      const margin = 0.2;
      let clampedX = xFt;
      let clampedY = yFt;

      if (bed.shape === "circle") {
        const centerX = bed.x + bed.width / 2;
        const centerY = bed.y + bed.height / 2;
        const radius = Math.max(0.2, Math.min(bed.width, bed.height) / 2 - margin);
        const dx = xFt - centerX;
        const dy = yFt - centerY;
        const distance = Math.hypot(dx, dy);

        if (distance > radius && distance > 0) {
          const scale = radius / distance;
          clampedX = centerX + dx * scale;
          clampedY = centerY + dy * scale;
        }
      } else {
        clampedX = clamp(xFt, bed.x + margin, bed.x + bed.width - margin);
        clampedY = clamp(yFt, bed.y + margin, bed.y + bed.height - margin);
      }

      plant.x = roundToTwo(clampedX);
      plant.y = roundToTwo(clampedY);
      return next;
    });
  }

  function commitLayoutIfNeeded() {
    if (!draggingPlantId) {
      return;
    }
    setDraggingPlantId(null);
    if (onLayoutChange) {
      onLayoutChange(latestLayoutRef.current);
    }
  }

  function resetToSuggestedLayout() {
    const cloned = deepCloneLayout(baseLayoutRef.current);
    setLocalLayout(cloned);
    setSelected(null);
    if (onLayoutChange) {
      onLayoutChange(cloned);
    }
  }

  function copySelectedPlant() {
    if (!selectedPlant) {
      return;
    }
    setPlantClipboard(deepCloneLayout(selectedPlant));
  }

  function pastePlant() {
    if (!plantClipboard) {
      return;
    }

    setLocalLayout((prev) => {
      const next = deepCloneLayout(prev);
      const selectedBedId = selected?.type === "bed" ? selected.id : null;
      const sourceBedId = selectedBedId || plantClipboard.bedId;
      const sourceBed = next.beds.find((bed) => bed.id === sourceBedId) || next.beds[0];
      if (!sourceBed) {
        return prev;
      }

      const seedX = plantClipboard.x || sourceBed.x + sourceBed.width / 2;
      const seedY = plantClipboard.y || sourceBed.y + sourceBed.height / 2;

      let x = seedX + 0.35;
      let y = seedY + 0.35;

      if (sourceBed.shape === "circle") {
        const centerX = sourceBed.x + sourceBed.width / 2;
        const centerY = sourceBed.y + sourceBed.height / 2;
        const radius = Math.max(0.2, Math.min(sourceBed.width, sourceBed.height) / 2 - 0.2);
        const dx = x - centerX;
        const dy = y - centerY;
        const distance = Math.hypot(dx, dy);
        if (distance > radius && distance > 0) {
          const scale = radius / distance;
          x = centerX + dx * scale;
          y = centerY + dy * scale;
        }
      } else {
        x = clamp(x, sourceBed.x + 0.2, sourceBed.x + sourceBed.width - 0.2);
        y = clamp(y, sourceBed.y + 0.2, sourceBed.y + sourceBed.height - 0.2);
      }

      const newPlant = {
        ...plantClipboard,
        id: newPlantId(),
        bedId: sourceBed.id,
        x: roundToTwo(x),
        y: roundToTwo(y),
      };

      next.plants.push(newPlant);
      return next;
    });

    if (onLayoutChange) {
      requestAnimationFrame(() => {
        onLayoutChange(latestLayoutRef.current);
      });
    }
  }

  return (
    <div className="garden-sketch-wrap">
      <div className="garden-sketch-toolbar">
        <h3>{title}</h3>
        <div className="garden-sketch-controls">
          <label>
            Zoom
            <input
              type="range"
              min="0.7"
              max="1.6"
              step="0.1"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>
          <button
            type="button"
            className="sketch-mini-btn"
            onClick={() => setShowPlantLabels((prev) => !prev)}
          >
            {showPlantLabels ? "Hide Labels" : "Show Labels"}
          </button>
          <button
            type="button"
            className="sketch-mini-btn"
            onClick={() => setShowSunZones((prev) => !prev)}
          >
            {showSunZones ? "Hide Sun Zones" : "Show Sun Zones"}
          </button>
          <button type="button" className="sketch-mini-btn" onClick={copySelectedPlant}>
            Copy Group
          </button>
          <button type="button" className="sketch-mini-btn" onClick={pastePlant}>
            Paste Group
          </button>
          <button type="button" className="sketch-mini-btn" onClick={resetToSuggestedLayout}>
            Reset Layout
          </button>
        </div>
      </div>

      <p className="garden-sketch-hint">
        Drag green handles to move groups. Use Copy + Paste to repeat beneficial plant areas.
      </p>

      <div className="garden-sketch-legend">
        <span className="legend-item">
          <i className="shape-swatch square-solid" /> Solid Square Area
        </span>
        <span className="legend-item">
          <i className="shape-swatch circle-sunburst" /> Sunburst Circle Area
        </span>
        <span className="legend-item">
          <i className="sun-swatch full-sun" /> Full Sun
        </span>
        <span className="legend-item">
          <i className="sun-swatch partial-shade" /> Partial Shade
        </span>
        <span className="legend-item">
          <i className="sun-swatch shade" /> Shade
        </span>
      </div>

      <div className="garden-sketch-hover" role="status" aria-live="polite">
        {hoveredSection ? (
          <>
            <strong>{hoveredSection.title}</strong>
            <span>{hoveredSection.subtitle}</span>
            <span>{hoveredSection.details}</span>
          </>
        ) : (
          <span>Hover a bed, patch, or sun zone for quick section details.</span>
        )}
      </div>

      <div className="garden-sketch-stage">
        <div
          className="garden-sketch-zoom-layer"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
        >
          <svg
            viewBox={model.viewBox}
            width={model.widthPx}
            height={model.heightPx}
            ref={baseSvgRef}
            className="garden-sketch-svg"
            role="img"
            aria-label="Interactive garden sketch"
          />

          <svg
            ref={overlayRef}
            viewBox={model.viewBox}
            width={model.widthPx}
            height={model.heightPx}
            className="garden-sketch-overlay"
            onPointerMove={(event) => {
              if (!draggingPlantId) {
                return;
              }
              const nextPoint = pointEventToFeet(event);
              if (!nextPoint) {
                return;
              }
              updatePlantPosition(draggingPlantId, nextPoint.xFt, nextPoint.yFt);
            }}
            onPointerUp={commitLayoutIfNeeded}
            onPointerCancel={commitLayoutIfNeeded}
            onPointerLeave={() => {
              setHoveredSection(null);
              commitLayoutIfNeeded();
            }}
          >
            {model.sunZones.map((zone) => (
              <rect
                key={zone.id}
                x={zone.xPx}
                y={zone.yPx}
                width={zone.widthPx}
                height={zone.heightPx}
                fill="transparent"
                stroke="transparent"
                onMouseEnter={() => setSunZoneHover(zone)}
                onMouseLeave={() => setHoveredSection(null)}
              />
            ))}

            {model.beds.map((bed) => {
              const label = bedLabelPosition(bed);
              return (
                <g key={bed.id}>
                  {bed.shape === "circle" ? (
                    <circle
                      cx={bed.cxPx}
                      cy={bed.cyPx}
                      r={bed.rPx}
                      fill="transparent"
                      stroke="transparent"
                      onClick={() => setSelected({ type: "bed", id: bed.id })}
                      onMouseEnter={() => setBedHover(bed)}
                      onMouseLeave={() => setHoveredSection(null)}
                    />
                  ) : (
                    <rect
                      x={bed.xPx}
                      y={bed.yPx}
                      width={bed.widthPx}
                      height={bed.heightPx}
                      fill="transparent"
                      stroke="transparent"
                      onClick={() => setSelected({ type: "bed", id: bed.id })}
                      onMouseEnter={() => setBedHover(bed)}
                      onMouseLeave={() => setHoveredSection(null)}
                    />
                  )}
                  <text
                    x={label.x}
                    y={label.y}
                    textAnchor={label.anchor}
                    className={label.className}
                  >
                    {bed.name}
                  </text>
                </g>
              );
            })}

            {model.plantPatches.map((patch) => {
              const plant = plantsById.get(patch.plantId);
              if (!plant) {
                return null;
              }

              if (patch.shape === "circle") {
                return (
                  <circle
                    key={`hot-${patch.id}`}
                    className="patch-hit"
                    cx={patch.xPx + patch.widthPx / 2}
                    cy={patch.yPx + patch.heightPx / 2}
                    r={Math.min(patch.widthPx, patch.heightPx) / 2}
                    onClick={() => setSelected({ type: "plant", id: patch.plantId })}
                    onMouseEnter={() => setPlantHover(plant)}
                    onMouseLeave={() => setHoveredSection(null)}
                  />
                );
              }

              return (
                <rect
                  key={`hot-${patch.id}`}
                  className="patch-hit"
                  x={patch.xPx}
                  y={patch.yPx}
                  width={patch.widthPx}
                  height={patch.heightPx}
                  onClick={() => setSelected({ type: "plant", id: patch.plantId })}
                  onMouseEnter={() => setPlantHover(plant)}
                  onMouseLeave={() => setHoveredSection(null)}
                />
              );
            })}

            {model.plants.map((plant) => (
              <g key={plant.id} onClick={() => setSelected({ type: "plant", id: plant.id })}>
                <circle
                  className="plant-handle"
                  cx={plant.xPx}
                  cy={plant.yPx}
                  r={11}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    setSelected({ type: "plant", id: plant.id });
                    setDraggingPlantId(plant.id);
                    if (event.currentTarget.setPointerCapture) {
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }
                  }}
                  onMouseEnter={() => setPlantHover(plant)}
                  onMouseLeave={() => setHoveredSection(null)}
                />
                {showPlantLabels ? (
                  <text className="plant-label" x={plant.xPx + 11} y={plant.yPx - 10}>
                    {plant.name} x{plant.quantity || 1}
                  </text>
                ) : null}
              </g>
            ))}

            <SelectedOverlay model={model} selected={selected} />
          </svg>
        </div>
      </div>

      <div className="garden-sketch-meta">
        <span>
          Size: {localLayout.garden.width} x {localLayout.garden.height} ft
        </span>
        <span>Beds: {localLayout.beds.length}</span>
        <span>Plant Groups: {localLayout.plants.length}</span>
        <span>
          Companion Groups: {localLayout.companions?.length || 0}
        </span>
      </div>

      {selectedPlant ? (
        <div className="garden-sketch-selection">
          <strong>{selectedPlant.name}</strong>
          <span>
            Position: {selectedPlant.x}ft, {selectedPlant.y}ft
          </span>
          <span>Qty: {selectedPlant.quantity || 1}</span>
          <span>Spacing: {selectedPlant.spacingInches || "n/a"} in</span>
          <span>Sun: {displaySunNeed(selectedPlant.sunNeeds)}</span>
        </div>
      ) : null}

      {selectedBed ? (
        <div className="garden-sketch-selection">
          <strong>{selectedBed.name}</strong>
          <span>
            Bed: {selectedBed.width} x {selectedBed.height} ft
          </span>
          <span>Shape: {selectedBed.shape || "rect"}</span>
        </div>
      ) : null}
    </div>
  );
}

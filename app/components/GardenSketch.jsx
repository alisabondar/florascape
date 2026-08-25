"use client";

import rough from "roughjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { layoutToSvgModel } from "../../lib/garden-layout";
import { SelectControl } from "./FormControls";

const SVG_NS = "http://www.w3.org/2000/svg";
const ROUGHNESS = 0.5;

const SUN_ZONE_COLORS = {
  full_sun: { fill: "#f6d785", stroke: "#a97924", label: "Full sun (6+ hours)" },
  partial_shade: { fill: "#dce7bc", stroke: "#718249", label: "Partial shade (3–6 hours)" },
  shade: { fill: "#ccd9e8", stroke: "#627c94", label: "Mostly shade (under 3 hours)" },
};

function deepCloneLayout(layout) {
  return structuredClone(layout);
}

function newPlantId() {
  return `plant-${crypto.randomUUID()}`;
}

function cleanPlacementReason(value) {
  return String(value || "Fits this area's light and spacing.").trim();
}

function roundToQuarter(value) {
  return Math.round(value * 4) / 4;
}

function zoneLabelText(plant, patch) {
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
  svg,
  { x, y, text, className, fill = "#4e5e51", fontSize = 10, anchor = "start" },
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

function drawPlantGlyph(roughSvg, marker) {
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

function bedLabel(bed, garden) {
  if (bed.sunExposureLabel || bed.sunExposure) {
    const exposure = bed.sunExposureLabel || bed.sunExposure;
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
}) {
  const [localLayout, setLocalLayout] = useState(() => deepCloneLayout(layout));
  const [tooltip, setTooltip] = useState(null);
  const [templateCatalog, setTemplateCatalog] = useState(() =>
    deepCloneLayout(layout.plants || []),
  );
  const [newPlantName, setNewPlantName] = useState(layout.plants?.[0]?.name || "");
  const [newPlantBedId, setNewPlantBedId] = useState(layout.beds?.[0]?.id || "");
  const [newPlantQuantity, setNewPlantQuantity] = useState(1);

  const baseSvgRef = useRef(null);
  const stageRef = useRef(null);
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

  function commitLayout(nextLayout) {
    latestLayoutRef.current = nextLayout;
    setLocalLayout(nextLayout);
    setTooltip(null);
    onLayoutChange?.(nextLayout);
  }

  function adjustPlantQuantity(plantId, amount) {
    const next = deepCloneLayout(latestLayoutRef.current);
    const plant = next.plants.find((item) => item.id === plantId);
    if (!plant) {
      return;
    }
    const quantity = Math.min(80, (Number(plant.quantity) || 1) + amount);
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
    const existing = next.plants.find(
      (plant) => plant.name === newPlantName && plant.bedId === newPlantBedId,
    );
    const quantity = Math.max(1, Math.min(80, Math.floor(Number(newPlantQuantity) || 1)));
    if (existing) {
      existing.quantity = Math.min(80, (Number(existing.quantity) || 1) + quantity);
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

  function showPlantTooltip(event, plant, patch) {
    const stage = stageRef.current;
    if (!stage) {
      return;
    }
    const rect = stage.getBoundingClientRect();
    const canvasRect = baseSvgRef.current?.getBoundingClientRect() || rect;
    const scaleX = canvasRect.width / model.widthPx;
    const scaleY = canvasRect.height / model.heightPx;
    const tooltipWidth = 280;
    const clientX = Number.isFinite(event.clientX)
      ? event.clientX
      : canvasRect.left + patch.centerX * scaleX;
    const clientY = Number.isFinite(event.clientY)
      ? event.clientY
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

  function openGuide(plant) {
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
            <span>Use the controls to rebalance how much space each plant receives.</span>
          </div>
        </div>

        <div className="plant-group-adjustments">
          {localLayout.plants.map((plant) => (
            <div className="plant-group-adjustment" key={plant.id}>
              <div>
                <strong>{plant.name}</strong>
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
                onClick={() => setNewPlantQuantity((value) => Math.min(80, value + 1))}
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

      <div className="garden-sketch-stage" ref={stageRef}>
        <div className="garden-sketch-zoom-layer">
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
            {model.plantPatches.map((patch) => {
              const plant = plantsById.get(patch.plantId);
              if (!plant) {
                return null;
              }
              const zoneLabel = zoneLabelText(plant, patch);
              return (
                <g key={`hot-${patch.id}`}>
                  <rect
                    className="patch-hit"
                    x={patch.xPx}
                    y={patch.yPx}
                    width={patch.widthPx}
                    height={patch.heightPx}
                    tabIndex={0}
                    role="button"
                    aria-label={`${plant.name}, ${plant.quantity || 1} mature plants, about ${roundToQuarter(patch.width)} by ${roundToQuarter(patch.height)} feet`}
                    onClick={() => openGuide(plant)}
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
      </div>

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

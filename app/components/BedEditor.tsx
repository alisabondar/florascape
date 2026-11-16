"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { startingAmountLabel } from "../../lib/plan/shopping";
import { layoutTableRows } from "../../lib/plan/view";
import { zoneCapacity } from "../../lib/plan/fill";
import { layoutToSvgModel } from "../../lib/garden-layout";
import type { FollowUpOption } from "../../lib/season";
import { MAX_PLANT_QUANTITY } from "../../lib/planner-config";
import type { AlternativesByBed, ClimateContext, Layout, Plant } from "../../lib/types";
import { SelectControl } from "./FormControls";
import GardenDiorama from "./GardenDiorama";
import PixelPlot from "./PixelPlot";

interface BedEditorProps {
  layout: Layout;
  alternatives?: AlternativesByBed | null;
  onLayoutChange?: (layout: Layout) => void;
  onSwapPlant?: (plantId: string, plantName: string) => void;
  onSwapZones?: (firstId: string, secondId: string) => void;
  /** Called when a zone is clicked, e.g. to jump to the plant's guide entry. */
  onZoneSelect?: (plant: Plant) => void;
  /** Fold the editing controls behind an "Edit plant groups" toggle. */
  collapsible?: boolean;
  /** Frost dates for the season view; typical dates are used without them. */
  climate?: ClimateContext | null;
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function newPlantId() {
  return `plant-${crypto.randomUUID()}`;
}

// Manual edits release a bed's locked zone shares so quantities rebalance its space again.
function releaseZoneShares(next: Layout, bedId: string) {
  next.plants.forEach((item) => {
    if (item.bedId === bedId) {
      delete item.areaShare;
    }
  });
}

/**
 * The pixel garden plus its editing controls: swap a group's plant, change how many
 * plants a group has, add a group, drag zones to swap them, or view the layout as a table.
 */
export default function BedEditor({
  layout,
  alternatives = null,
  onLayoutChange,
  onSwapPlant,
  onSwapZones,
  onZoneSelect,
  collapsible = false,
  climate = null,
}: BedEditorProps) {
  // "season": the 3/4 garden with a month scrubber; "layout": the flat plan for drag-to-swap.
  const [view, setView] = useState<"season" | "layout">("season");
  const [localLayout, setLocalLayout] = useState(() => clone(layout));
  const [templateCatalog, setTemplateCatalog] = useState(() => clone(layout.plants || []));
  const [newPlantName, setNewPlantName] = useState(layout.plants?.[0]?.name || "");
  const [newPlantBedId, setNewPlantBedId] = useState(layout.beds?.[0]?.id || "");
  const [newPlantQuantity, setNewPlantQuantity] = useState(1);
  const [showTable, setShowTable] = useState(false);
  const latestLayoutRef = useRef(localLayout);

  useEffect(() => {
    const cloned = clone(layout);
    latestLayoutRef.current = cloned;
    setLocalLayout(cloned);
    setTemplateCatalog((previous) => {
      const byName = new Map(previous.map((plant) => [plant.name.toLowerCase(), plant]));
      (layout.plants || []).forEach((plant) => {
        if (!byName.has(plant.name.toLowerCase())) {
          byName.set(plant.name.toLowerCase(), clone(plant));
        }
      });
      return [...byName.values()];
    });
    setNewPlantName((previous) => previous || layout.plants?.[0]?.name || "");
    setNewPlantBedId((previous) =>
      layout.beds?.some((bed) => bed.id === previous) ? previous : layout.beds?.[0]?.id || "",
    );
  }, [layout]);

  const tableRows = useMemo(() => layoutTableRows(localLayout), [localLayout]);
  const bedsById = useMemo(() => new Map(localLayout.beds.map((bed) => [bed.id, bed])), [localLayout.beds]);
  const templateOptions = useMemo(
    () => templateCatalog.map((plant) => ({ value: plant.name, label: plant.name })),
    [templateCatalog],
  );
  const bedOptions = useMemo(
    () => localLayout.beds.map((bed) => ({ value: bed.id, label: bed.name })),
    [localLayout.beds],
  );

  function commitLayout(nextLayout: Layout) {
    latestLayoutRef.current = nextLayout;
    setLocalLayout(nextLayout);
    onLayoutChange?.(nextLayout);
  }

  /** Puts a follow-up crop in a plant group's zone (or clears it), filled to the zone's capacity. */
  function setFollowUp(plantId: string, option: FollowUpOption | null) {
    const next = clone(latestLayoutRef.current);
    const plant = next.plants.find((item) => item.id === plantId);
    if (!plant) {
      return;
    }
    if (!option) {
      delete plant.followUp;
    } else {
      const patch = layoutToSvgModel(next, 1, 0).plantPatches.find((item) => item.plantId === plantId);
      const shape = next.beds.find((bed) => bed.id === plant.bedId)?.shape;
      const quantity = patch ? zoneCapacity(patch.width, patch.height, option.spacingInches, shape) : 1;
      plant.followUp = { name: option.name, spacingInches: option.spacingInches, quantity };
    }
    commitLayout(next);
  }

  function setSeedsSaved(plantId: string, saved: boolean) {
    const next = clone(latestLayoutRef.current);
    const plant = next.plants.find((item) => item.id === plantId);
    if (plant) {
      plant.seedsSaved = saved || undefined;
      commitLayout(next);
    }
  }

  function adjustPlantQuantity(plantId: string, amount: number) {
    const next = clone(latestLayoutRef.current);
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
    const next = clone(latestLayoutRef.current);
    releaseZoneShares(next, bed.id);
    const existing = next.plants.find((plant) => plant.name === newPlantName && plant.bedId === newPlantBedId);
    const quantity = Math.max(1, Math.min(MAX_PLANT_QUANTITY, Math.floor(Number(newPlantQuantity) || 1)));
    if (existing) {
      existing.quantity = Math.min(MAX_PLANT_QUANTITY, (Number(existing.quantity) || 1) + quantity);
    } else {
      next.plants.push({
        ...clone(template),
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

  return (
    <div className="bed-editor">
      <div className="bed-editor-views no-print" role="group" aria-label="Garden view">
        <button type="button" aria-pressed={view === "season"} onClick={() => setView("season")}>Season</button>
        <button type="button" aria-pressed={view === "layout"} onClick={() => setView("layout")}>Layout</button>
      </div>
      {view === "season" ? (
        <GardenDiorama
          layout={localLayout}
          climate={climate}
          onZoneSelect={onZoneSelect}
          onFollowUp={onLayoutChange ? setFollowUp : undefined}
          onSeedsSaved={onLayoutChange ? setSeedsSaved : undefined}
        />
      ) : (
        <PixelPlot layout={localLayout} stage={3} maxTile={72} maxHeight={640} onZoneSelect={onZoneSelect} onSwapZones={onSwapZones} />
      )}
      <p className="bed-editor-hint no-print">
        Click a patch for its guide{view === "layout" && onSwapZones ? " · drag one onto another to swap" : ""}.
      </p>

      <details className="garden-sketch-editor no-print" open={collapsible ? undefined : true}>
        <summary className="garden-sketch-editor-heading">
          <div>
            <strong>Edit plant groups</strong>
            <span>Swap plants or change how many of each.</span>
          </div>
        </summary>

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
                        .map((item) => ({ value: item.name, label: item.name, description: item.reason })),
                    ]}
                    ariaLabel={`Swap ${plant.name} in ${bedsById.get(plant.bedId)?.name || "this area"}`}
                  />
                ) : (
                  <strong>{plant.name}</strong>
                )}
                <span>{bedsById.get(plant.bedId)?.name || "Growing area"}</span>
              </div>
              <div className="plant-group-count">
                <div className="quantity-stepper" aria-label={`${plant.name} mature plants`}>
                  <button type="button" onClick={() => adjustPlantQuantity(plant.id, -1)} aria-label={`Decrease ${plant.name}`}>
                    −
                  </button>
                  <output>{plant.quantity || 1}</output>
                  <button type="button" onClick={() => adjustPlantQuantity(plant.id, 1)} aria-label={`Increase ${plant.name}`}>
                    +
                  </button>
                </div>
                <span className="plant-group-count-label">
                  plants · {startingAmountLabel(plant.name, plant.quantity || 1)}
                </span>
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

        <div className="garden-sketch-view-toggles">
          <button
            type="button"
            className="sketch-toggle"
            aria-pressed={showTable}
            aria-controls="garden-layout-table"
            onClick={() => setShowTable((value) => !value)}
          >
            View as table
          </button>
        </div>
      </details>

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
    </div>
  );
}

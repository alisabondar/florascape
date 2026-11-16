"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { layoutToSvgModel, plantSpots, singleBed } from "../../lib/garden-layout";
import { findPlantFacts } from "../../lib/plant-facts";
import { followUpOptions, MONTH_NAMES, monthTasks, patchState, seasonTimeline, seedSavingTip, startingMonth } from "../../lib/season";
import type { FollowUpOption } from "../../lib/season";
import type { SeasonStage } from "../../lib/season";
import type { ClimateContext, Layout, Plant } from "../../lib/types";
import PixelSprite from "./PixelSprite";
import "./diorama.css";

interface GardenDioramaProps {
  layout: Layout;
  climate?: ClimateContext | null;
  /** Called with the plant group when its patch is clicked or activated by keyboard. */
  onZoneSelect?: (plant: Plant) => void;
  /** Month to open on (0 = Jan) instead of this month, e.g. midsummer for a sample. */
  initialMonth?: number;
  /** false hides the month's jobs list under the scene (e.g. a compact sample). */
  showTasks?: boolean;
  /** false hides the per-patch name tags (they're also hidden automatically when the scene is small). */
  showLabels?: boolean;
  /** Sets (or with null, clears) the crop that takes over a plant group's zone once it's done. */
  onFollowUp?: (plantId: string, option: FollowUpOption | null) => void;
  /** Marks seeds saved (or not) from a finished plant group. */
  onSeedsSaved?: (plantId: string, saved: boolean) => void;
}

/** Most sprites drawn in one patch; denser patches thin their grid (labels keep the count). */
const MAX_SPRITES_PER_PATCH = 90;
const PLAY_STEP_MS = 1100;

const STAGE_WORD: Record<SeasonStage, string> = {
  empty: "Not yet",
  planted: "Plant now",
  growing: "Growing",
  harvest: "Pick",
  done: "Finished",
};

/**
 * The garden seen from three-quarters above: beds as raised boxes, every plant standing on
 * its real spot, drawn at its stage for the chosen month. A month scrubber walks the season
 * from first planting to the last harvest.
 */
export default function GardenDiorama({
  layout: sourceLayout,
  climate = null,
  onZoneSelect,
  initialMonth,
  showTasks = true,
  showLabels = true,
  onFollowUp,
  onSeedsSaved,
}: GardenDioramaProps) {
  // One bed at a time, picked with tabs: big enough to read, nothing hidden behind another bed.
  const [bedId, setBedId] = useState(sourceLayout.beds[0]?.id ?? "");
  const activeBedId = sourceLayout.beds.some((bed) => bed.id === bedId) ? bedId : sourceLayout.beds[0]?.id ?? "";
  const layout = useMemo(() => singleBed(sourceLayout, activeBedId), [sourceLayout, activeBedId]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function onTabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const count = sourceLayout.beds.length;
    const next =
      event.key === "ArrowRight" ? (index + 1) % count
      : event.key === "ArrowLeft" ? (index - 1 + count) % count
      : event.key === "Home" ? 0
      : event.key === "End" ? count - 1
      : -1;
    if (next < 0) {
      return;
    }
    event.preventDefault();
    setBedId(sourceLayout.beds[next].id);
    tabRefs.current[next]?.focus();
  }
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) {
      return undefined;
    }
    setWidth(node.clientWidth);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // The whole garden sets the season, so the months stay put when switching beds.
  const timeline = useMemo(() => seasonTimeline(sourceLayout, climate), [sourceLayout, climate]);
  const [month, setMonth] = useState(() =>
    initialMonth !== undefined && timeline.months.includes(initialMonth) ? initialMonth : startingMonth(timeline),
  );
  const [playing, setPlaying] = useState(false);
  // Keep the month valid when the plants (and so the season) change.
  const activeMonth = timeline.months.includes(month) ? month : startingMonth(timeline);

  useEffect(() => {
    if (!playing) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setMonth((current) => {
        const index = timeline.months.indexOf(current);
        if (index < 0 || index >= timeline.months.length - 1) {
          setPlaying(false);
          return current;
        }
        return timeline.months[index + 1];
      });
    }, PLAY_STEP_MS);
    return () => window.clearInterval(timer);
  }, [playing, timeline]);

  function togglePlay() {
    if (!playing && activeMonth === timeline.months.at(-1)) {
      setMonth(timeline.months[0]);
    }
    setPlaying((value) => !value);
  }

  function pickMonth(next: number) {
    setPlaying(false);
    setMonth(next);
  }

  const model = useMemo(() => layoutToSvgModel(layout, 1, 0), [layout]);
  const plants = useMemo(() => new Map(layout.plants.map((plant) => [plant.id, plant])), [layout.plants]);
  const { width: gardenW, height: gardenH } = layout.garden;

  // Isometric projection: one foot along x goes right-down, along y goes left-down.
  const unit = Math.max(4, Math.min(40, Math.floor((width - 24) / Math.max(1, gardenW + gardenH))));
  const depth = Math.max(4, Math.round(unit * 0.55));
  const originX = gardenH * unit + 12;
  const originY = Math.max(56, unit * 2.4); // room for the tallest sprites on the back row
  const project = (x: number, y: number) => ({ x: originX + (x - y) * unit, y: originY + ((x + y) * unit) / 2 });
  const stageWidth = (gardenW + gardenH) * unit + 24;
  const stageHeight = originY + ((gardenW + gardenH) * unit) / 2 + depth + 48;
  const points = (corners: { x: number; y: number }[]) => corners.map((point) => `${point.x},${point.y}`).join(" ");
  const corners = (x: number, y: number, w: number, h: number) => [project(x, y), project(x + w, y), project(x + w, y + h), project(x, y + h)];

  const patches = model.plantPatches
    .map((patch) => {
      const plant = plants.get(patch.plantId);
      if (!plant || !timeline.byPlant.has(plant.id)) {
        return null;
      }
      // Once a follow-up crop is sown, the zone shows that crop instead of the first one.
      const state = patchState(plant, timeline, activeMonth);
      const shown: Plant = { ...plant, name: state.name, spacingInches: state.spacingInches, quantity: state.quantity };
      return { patch, plant, shown, stage: state.stage };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const sprites = patches
    .flatMap(({ patch, shown: plant, stage }) => {
      if (stage === "empty") {
        return [];
      }
      const bed = model.beds.find((item) => item.id === patch.bedId);
      const spots = plantSpots(patch, plant, bed);
      const spacingFt = Math.max(1, Number(plant.spacingInches) || 8) / 12;
      // Thin the grid when sprites would sit closer than ~10px apart (small screens, tight spacing).
      const crowding = Math.ceil((10 / Math.max(1, spacingFt * unit)) ** 2);
      const step = Math.max(crowding, Math.ceil(spots.length / MAX_SPRITES_PER_PATCH));
      // Sprites grow with spacing, but only to about half their circle and at most 2×, so a
      // lone wide-spaced plant (one tomato) stays plant-sized instead of filling the bed.
      const scale = Math.max(1, Math.min(2, Math.round((spacingFt * unit * 0.5) / 16)));
      const transplant = findPlantFacts(plant.name)?.sowing === "transplant";
      return spots
        .filter((_, index) => index % step === 0)
        .map((spot, index) => ({ key: `${plant.id}-${plant.name}-${index}`, plant, stage, spot, scale, transplant }));
    })
    .sort((left, right) => left.spot.x + left.spot.y - (right.spot.x + right.spot.y));

  const tasks = monthTasks(layout, timeline, activeMonth);
  const monthName = MONTH_NAMES[activeMonth];
  const summary = [
    tasks.plant.length ? `${tasks.plant.length} to plant` : "",
    tasks.pick.length ? `${tasks.pick.length} to pick` : "",
    tasks.growing.length ? `${tasks.growing.length} growing` : "",
  ]
    .filter(Boolean)
    .join(", ");

  function onPatchKey(event: KeyboardEvent<SVGPolygonElement>, plant: Plant) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onZoneSelect?.(plant);
    }
  }

  if (!timeline.months.length) {
    return null;
  }

  return (
    <div className="diorama" ref={containerRef}>
      {sourceLayout.beds.length > 1 ? (
        <div className="diorama-beds no-print" role="tablist" aria-label="Beds">
          {sourceLayout.beds.map((bed, index) => (
            <button
              type="button"
              role="tab"
              key={bed.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              aria-selected={bed.id === activeBedId}
              tabIndex={bed.id === activeBedId ? 0 : -1}
              onClick={() => setBedId(bed.id)}
              onKeyDown={(event) => onTabKey(event, index)}
            >
              {bed.name}
              <small>{bed.width}×{bed.height} ft</small>
            </button>
          ))}
        </div>
      ) : null}
      <div className="diorama-controls no-print">
        <p className="diorama-month px" aria-hidden="true">{monthName}</p>
        <button
          type="button"
          className="diorama-play"
          onClick={togglePlay}
          aria-pressed={playing}
          aria-label={playing ? "Pause the season" : "Play the season"}
        >
          {playing ? (
            <svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="2" width="3.5" height="12" /><rect x="9.5" y="2" width="3.5" height="12" /></svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2l10 6-10 6z" /></svg>
          )}
        </button>
        <div className="diorama-scrub">
          <input
            type="range"
            min={0}
            max={timeline.months.length - 1}
            step={1}
            value={timeline.months.indexOf(activeMonth)}
            onChange={(event) => pickMonth(timeline.months[Number(event.target.value)])}
            aria-label="Month"
            aria-valuetext={`${monthName}${summary ? `: ${summary}` : ""}`}
          />
          <div className="diorama-ticks" style={{ gridTemplateColumns: `repeat(${timeline.months.length}, 1fr)` }}>
            {timeline.months.map((value) => (
              <button
                type="button"
                key={value}
                className="diorama-tick"
                aria-pressed={value === activeMonth}
                aria-label={`Show ${MONTH_NAMES[value]}`}
                onClick={() => pickMonth(value)}
              >
                {MONTH_NAMES[value]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="diorama-stage"
        style={{ width: stageWidth, height: stageHeight }}
        role={sourceLayout.beds.length > 1 ? "tabpanel" : undefined}
        aria-label={sourceLayout.beds.length > 1 ? layout.beds[0]?.name : undefined}
      >
        <svg className="diorama-ground" width={stageWidth} height={stageHeight} role="img" aria-label={`Garden in ${monthName}${summary ? `: ${summary}` : ""}`}>
          <polygon className="diorama-lawn" points={points(corners(0, 0, gardenW, gardenH))} />
          {[...model.beds]
            .sort((left, right) => left.x + left.y - (right.x + right.y))
            .map((bed) => {
              const [a, b, c, d] = corners(bed.x, bed.y, bed.width, bed.height);
              return (
                <g key={bed.id}>
                  <polygon className="diorama-bed-side left" points={points([d, c, { x: c.x, y: c.y + depth }, { x: d.x, y: d.y + depth }])} />
                  <polygon className="diorama-bed-side right" points={points([c, b, { x: b.x, y: b.y + depth }, { x: c.x, y: c.y + depth }])} />
                  <polygon className="diorama-bed-top" points={points([a, b, c, d])} />
                  <text className="diorama-bed-name" x={a.x} y={a.y - 6} textAnchor="middle">{bed.name}</text>
                </g>
              );
            })}
          {patches.map(({ patch, plant, shown, stage }) => (
            <polygon
              key={patch.id}
              className={`diorama-patch stage-${stage}${onZoneSelect ? " interactive" : ""}`}
              points={points(corners(patch.x, patch.y, patch.width, patch.height))}
              tabIndex={onZoneSelect ? 0 : undefined}
              role={onZoneSelect ? "button" : undefined}
              aria-label={`${shown.name}, ${shown.quantity} plants, ${STAGE_WORD[stage].toLowerCase()} in ${monthName}`}
              onClick={onZoneSelect ? () => onZoneSelect(plant) : undefined}
              onKeyDown={onZoneSelect ? (event) => onPatchKey(event, plant) : undefined}
            />
          ))}
        </svg>

        {sprites.map(({ key, plant, stage, spot, scale, transplant }) => {
          const at = project(spot.x, spot.y);
          return (
            <PixelSprite
              key={`${key}-${stage}`}
              className={`diorama-sprite stage-${stage}`}
              style={{ left: at.x, top: at.y + 2 }}
              plantName={plant.name}
              scale={scale}
              motion={stage === "harvest" ? "sway" : "still"}
              stage={stage === "planted" ? (transplant ? 1 : 0) : stage === "growing" ? 2 : stage === "done" ? 0 : 3}
            />
          );
        })}

        {/* Small scenes (phones, big gardens) skip patch labels; the jobs list below names everything. */}
        {!showLabels || unit < 14 ? null : patches.map(({ patch, shown: plant, stage }) => {
          const front = project(patch.x + patch.width / 2, patch.y + patch.height);
          return (
            <span key={patch.id} className={`diorama-label stage-${stage}`} style={{ left: front.x, top: front.y + depth / 2 }} aria-hidden="true">
              <b>{plant.name}</b> ×{plant.quantity}
              {stage === "planted" || stage === "harvest" || stage === "done" ? <em>{STAGE_WORD[stage]}</em> : null}
            </span>
          );
        })}
      </div>

      {onFollowUp || onSeedsSaved ? (
        <AfterHarvest
          plants={layout.plants}
          timeline={timeline}
          month={activeMonth}
          climate={climate}
          bedSun={layout.beds[0]?.sunExposure}
          onFollowUp={onFollowUp}
          onSeedsSaved={onSeedsSaved}
        />
      ) : null}

      {showTasks ? (
      <div className="diorama-tasks" aria-live="polite">
        <p className="diorama-tasks-title">{monthName}</p>
        {tasks.plant.length ? <p><span className="diorama-tag plant">Plant</span>{tasks.plant.join(", ")}</p> : null}
        {tasks.pick.length ? <p><span className="diorama-tag pick">Pick</span>{tasks.pick.join(", ")}</p> : null}
        {tasks.free.length ? <p><span className="diorama-tag free">Space free</span>{tasks.free.join(", ")} finished, room for a fall crop.</p> : null}
        {!tasks.plant.length && !tasks.pick.length && !tasks.free.length ? (
          <p>{tasks.growing.length ? "Everything is growing. Water and weed." : "Nothing planted yet."}</p>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}

/**
 * For each plant group in the bed that's finished by this month: plant a follow-up crop in
 * its space (if the season allows), and how to save its seeds.
 */
function AfterHarvest({
  plants,
  timeline,
  month,
  climate,
  bedSun,
  onFollowUp,
  onSeedsSaved,
}: {
  plants: Plant[];
  timeline: ReturnType<typeof seasonTimeline>;
  month: number;
  climate: ClimateContext | null;
  bedSun?: string | null;
  onFollowUp?: (plantId: string, option: FollowUpOption | null) => void;
  onSeedsSaved?: (plantId: string, saved: boolean) => void;
}) {
  const finished = plants.filter((plant) => {
    const first = timeline.byPlant.get(plant.id);
    return first ? month > first.endMonth : false;
  });
  if (!finished.length) {
    return null;
  }
  return (
    <section className="diorama-after no-print" aria-label="After harvest">
      {finished.map((plant) => {
        const first = timeline.byPlant.get(plant.id)!;
        const next = timeline.followUps.get(plant.id);
        const options = plant.followUp ? [] : followUpOptions(plant, timeline, climate, bedSun);
        const seeds = seedSavingTip(plant.name);
        return (
          <div key={plant.id} className="diorama-after-row">
            <p className="diorama-after-head">
              <b>{plant.name}</b> finished in {MONTH_NAMES[first.endMonth]}.
            </p>
            {plant.followUp && next ? (
              <p className="diorama-after-line">
                <span className="diorama-tag plant">Then</span>
                {plant.followUp.name} ×{plant.followUp.quantity}, sown in {MONTH_NAMES[next.plantMonth]}.
                {onFollowUp ? (
                  <button type="button" className="diorama-link" onClick={() => onFollowUp(plant.id, null)}>
                    Remove
                  </button>
                ) : null}
              </p>
            ) : onFollowUp && options.length ? (
              <div className="diorama-after-line">
                <span className="diorama-tag plant">Plant next</span>
                <div className="diorama-chips" role="group" aria-label={`Follow-up crops for ${plant.name}`}>
                  {options.map((option) => (
                    <button type="button" key={option.name} className="diorama-chip" onClick={() => onFollowUp(plant.id, option)}>
                      {option.name} <small>{option.daysToMaturity} days</small>
                    </button>
                  ))}
                </div>
              </div>
            ) : onFollowUp ? (
              <p className="diorama-after-line">
                <span className="diorama-tag free">Rest</span>Too late for another crop before frost. Mulch the space or sow a cover crop.
              </p>
            ) : null}
            <p className="diorama-after-line">
              <span className="diorama-tag seeds">Seeds</span>
              {seeds.tip}
              {seeds.canSaveNow && onSeedsSaved ? (
                <button
                  type="button"
                  className="diorama-link"
                  aria-pressed={Boolean(plant.seedsSaved)}
                  onClick={() => onSeedsSaved(plant.id, !plant.seedsSaved)}
                >
                  {plant.seedsSaved ? "Seeds saved ✓" : "Mark seeds saved"}
                </button>
              ) : null}
            </p>
          </div>
        );
      })}
    </section>
  );
}

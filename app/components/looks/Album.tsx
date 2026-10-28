"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { getPlantSectionSizes } from "../../../lib/garden-layout";
import { groupGuideByTiming, slugify, startingAmountLabel } from "../../../lib/garden-plan";
import { findPlantFacts } from "../../../lib/plant-facts";
import type { Plant, PlantSunNeeds } from "../../../lib/types";
import BedEditor from "../BedEditor";
import GardenerPanel from "../progress/GardenerPanel";
import { recordProgress } from "../progress/store";
import PixelSprite from "../PixelSprite";
import type { LookDashboardProps } from "./types";
import "./album.css";

type Stamp = "planted" | "growing" | "harvested";
const STAMPS: { id: Stamp; label: string }[] = [
  { id: "planted", label: "Planted" },
  { id: "growing", label: "Growing" },
  { id: "harvested", label: "Harvested" },
];

type Rarity = "Easy" | "Patient" | "Common";
const RARITY_COLORS: Record<Rarity, { rar: string; bg: string }> = {
  Easy: { rar: "#2d6c8a", bg: "#e4f4d0" },
  Patient: { rar: "#a8541c", bg: "#ffe6c8" },
  Common: { rar: "#3f6b35", bg: "#d6eec4" },
};

const SUN_LABELS: Record<PlantSunNeeds, string> = {
  full_sun: "Full",
  partial_shade: "Part",
  shade: "Shade",
};

interface AlbumCard {
  name: string;
  quantity: number;
  firstGroup: Plant;
  rarity: Rarity;
  spacing: number;
  days: number | null;
  sun: string;
}

function hashString(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}

function isStamp(value: unknown): value is Stamp {
  return value === "planted" || value === "growing" || value === "harvested";
}

function formatMonthDay(value: string | null): string {
  if (!value) return "None recorded";
  const [month, day] = value.split("-").map(Number);
  if (!month || !day) return value;
  return new Date(2000, month - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildCards(plants: Plant[]): AlbumCard[] {
  const byName = new Map<string, AlbumCard>();
  for (const plant of plants) {
    if (plant.quantity <= 0) continue;
    const key = plant.name.trim().toLowerCase();
    const existing = byName.get(key);
    if (existing) {
      existing.quantity += plant.quantity;
      continue;
    }
    const facts = findPlantFacts(plant.name);
    const days = facts?.daysToMaturity ?? null;
    const rarity: Rarity = facts?.easyCare ? "Easy" : days !== null && days >= 90 ? "Patient" : "Common";
    byName.set(key, {
      name: plant.name,
      quantity: plant.quantity,
      firstGroup: plant,
      rarity,
      spacing: plant.spacingInches || facts?.spacingInches.min || 0,
      days,
      sun: SUN_LABELS[facts?.sunNeeds ?? plant.sunNeeds] ?? "Full",
    });
  }
  return [...byName.values()];
}

type Stage = 0 | 1 | 2 | 3;
const STAGE_LABELS = ["Seed", "Sprout", "Young", "Mature"] as const;
const DAY_MS = 86_400_000;

/**
 * How grown a card's sprite looks: a seed until it's stamped, then it grows with the days
 * since it was planted (toward its days to harvest). Stamps set a floor; Harvested is full grown.
 */
function stageFor(stamp: Stamp | undefined, plantedAt: string | undefined, days: number | null, now: number): Stage {
  if (!stamp) return 0;
  if (stamp === "harvested") return 3;
  const floor: Stage = stamp === "growing" ? 2 : 1;
  const started = plantedAt ? Date.parse(plantedAt) : NaN;
  if (!Number.isFinite(started)) return floor;
  const grown = Math.min(3, 1 + Math.floor((2 * (now - started)) / (DAY_MS * (days || 60)))) as Stage;
  return Math.max(floor, grown) as Stage;
}

const LEVEL_TITLES: Record<string, string> = {
  now: "Plant now",
  next_month: "Next month",
  next_season: "Later",
};

export default function AlbumDashboard({
  plan,
  climate,
  sourceLabel,
  warning,
  inputSummary,
  editHref,
  canShuffle,
  onShuffle,
  onCalendar,
  onPrint,
  onOpenGuide,
  onSwapPlant,
  onSwapZones,
  onLayoutChange,
}: LookDashboardProps) {
  const cards = useMemo(() => buildCards(plan.layout.plants), [plan.layout.plants]);
  const storageKey = useMemo(
    () => `florascape_album_${hashString(cards.map((card) => card.name.toLowerCase()).sort().join("|"))}`,
    [cards],
  );
  const [stamps, setStamps] = useState<Record<string, Stamp>>({});
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    const next: Record<string, Stamp> = {};
    try {
      const raw = window.localStorage.getItem(storageKey);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === "object") {
        for (const [name, value] of Object.entries(parsed)) if (isStamp(value)) next[name] = value;
      }
    } catch {
      // Ignore unreadable storage.
    }
    setStamps(next);
    setLoadedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (loadedKey !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(stamps));
    } catch {
      // Storage may be full or disabled; stamps just won't persist.
    }
  }, [stamps, storageKey, loadedKey]);

  // When each plant went in the ground, so its sprite can grow as the days pass.
  const datesKey = `${storageKey}_planted`;
  const [plantedAt, setPlantedAt] = useState<Record<string, string>>({});
  const [now, setNow] = useState(0);
  useEffect(() => {
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(datesKey) || "{}");
      const next: Record<string, string> = {};
      if (parsed && typeof parsed === "object") {
        for (const [name, value] of Object.entries(parsed)) if (typeof value === "string") next[name] = value;
      }
      setPlantedAt(next);
    } catch {
      setPlantedAt({});
    }
    setNow(Date.now());
  }, [datesKey]);

  const toggleStamp = (name: string, stamp: Stamp) => {
    const turningOn = stamps[name] !== stamp;
    if (turningOn && stamp !== "harvested" && !plantedAt[name]) {
      const next = { ...plantedAt, [name]: new Date().toISOString() };
      setPlantedAt(next);
      try {
        window.localStorage.setItem(datesKey, JSON.stringify(next));
      } catch {
        // Storage may be disabled; the sprite just won't grow over time.
      }
    }
    if (turningOn) {
      // Each stamp pays out once per plant per album, so toggling can't farm XP.
      const allHarvested =
        stamp === "harvested" && cards.every((card) => card.name.toLowerCase() === name || stamps[card.name.toLowerCase()] === "harvested");
      recordProgress({ kind: `stamp-${stamp}`, key: `stamp:${stamp}:${storageKey}:${name}`, detail: { allHarvested } });
    }
    setStamps((current) => {
      const next = { ...current };
      if (next[name] === stamp) delete next[name];
      else next[name] = stamp;
      return next;
    });
  };

  // Planting quests: one per plant in the season map, ticked off as they're done.
  const questKey = `${storageKey}_quests`;
  const [quests, setQuests] = useState<string[]>([]);
  useEffect(() => {
    try {
      const parsed: unknown = JSON.parse(window.localStorage.getItem(questKey) || "[]");
      setQuests(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []);
    } catch {
      setQuests([]);
    }
  }, [questKey]);

  const toggleQuest = (plantName: string) => {
    const id = plantName.toLowerCase();
    const next = quests.includes(id) ? quests.filter((item) => item !== id) : [...quests, id];
    if (!quests.includes(id)) {
      recordProgress({ kind: "quest-done", key: `quest:${storageKey}:${id}` });
    }
    setQuests(next);
    try {
      window.localStorage.setItem(questKey, JSON.stringify(next));
    } catch {
      // Storage may be disabled; quests just won't persist.
    }
  };

  const collected = cards.filter((card) => stamps[card.name.toLowerCase()]).length;
  const percent = cards.length ? Math.round((collected / cards.length) * 100) : 0;
  const levels = groupGuideByTiming(plan.plantingGuide);
  const totalPlants = cards.reduce((sum, card) => sum + card.quantity, 0);
  const headline = cards.length
    ? `Your ${cards.length}-card garden set`
    : "Your garden album";

  const guideByName = useMemo(
    () => new Map(plan.plantingGuide.map((entry) => [entry.plantName.toLowerCase(), entry])),
    [plan.plantingGuide],
  );
  const sectionSizes = useMemo(() => getPlantSectionSizes(plan.layout), [plan.layout]);

  // Folded details (planting guides, editor) print open.
  useEffect(() => {
    const openAll = () => document.querySelectorAll<HTMLDetailsElement>(".album-dash details").forEach((item) => {
      item.open = true;
    });
    window.addEventListener("beforeprint", openAll);
    return () => window.removeEventListener("beforeprint", openAll);
  }, []);

  return (
    <section className="look-dashboard album-dash" aria-labelledby="album-headline">
      <div className="album-toolbar no-print" role="toolbar" aria-label="Plan actions">
        {canShuffle ? (
          <button type="button" className="album-btn" onClick={onShuffle}>Shuffle</button>
        ) : null}
        <button type="button" className="album-btn" onClick={onCalendar}>Add to calendar</button>
        <button type="button" className="album-btn" onClick={onPrint}>Print</button>
        <a className="album-btn album-btn-ghost" href={editHref}>Edit inputs</a>
      </div>

      {/* 1. The spread: what this plan is (left) and the garden itself (right). */}
      <div className="album-binder">
        <div className="album-page album-page-left">
          <p className="album-source px">{sourceLabel}</p>
          <h1 id="album-headline" className="album-headline">{headline}</h1>
          {plan.summary ? <p className="album-lead">{plan.summary}</p> : null}
          {inputSummary ? <p className="album-inputs">{inputSummary}</p> : null}
          {warning ? <p className="album-warning" role="note">{warning}</p> : null}
          {climate ? (
            <dl className="album-turf-chips" aria-label="Home turf">
              <div><dt>Zone</dt><dd className="px">{climate.hardinessZone || "Unknown"}</dd></div>
              {climate.frost ? (
                <>
                  <div><dt>Last frost</dt><dd className="px">{formatMonthDay(climate.frost.lastSpringFrost)}</dd></div>
                  <div><dt>First frost</dt><dd className="px">{formatMonthDay(climate.frost.firstFallFrost)}</dd></div>
                  <div><dt>Season</dt><dd className="px">{climate.frost.growingSeasonDays} days</dd></div>
                </>
              ) : null}
            </dl>
          ) : null}
        </div>

        <div className="album-page album-page-right">
          <section aria-labelledby="album-plot-title">
            <h2 id="album-plot-title" className="album-page-title">The bed these cards fill</h2>
            <BedEditor
              layout={plan.layout}
              alternatives={plan.alternatives}
              onLayoutChange={onLayoutChange}
              onSwapPlant={onSwapPlant}
              onSwapZones={onSwapZones}
              onZoneSelect={onOpenGuide}
              collapsible
            />
          </section>
        </div>
      </div>

      {/* 2. The cards: one per plant, each with its own planting guide. */}
      <section className="album-cards-section" aria-labelledby="album-cards-title">
        <h2 id="album-cards-title" className="album-section-title">Plant cards</h2>
        <ul className="album-sleeves">
          {cards.map((card) => {
            const colors = RARITY_COLORS[card.rarity];
            const key = card.name.toLowerCase();
            const active = stamps[key];
            const stage = stageFor(active, plantedAt[key], card.days, now);
            const activeLabel = STAMPS.find((s) => s.id === active)?.label;
            const guide = guideByName.get(key);
            const sizes = sectionSizes[key] || [];
            const style = { "--rar": colors.rar, "--bg": colors.bg } as CSSProperties;
            return (
              <li key={key} className="album-card" style={style}>
                <span className="album-rarity px">{card.rarity}</span>
                {activeLabel ? <span className={`album-stamp-mark is-${active}`} aria-hidden="true">{activeLabel}</span> : null}
                <div className="album-art" aria-hidden="true">
                  <PixelSprite plantName={card.name} motion="still" stage={stage} />
                  <span className="album-art-stage px">{STAGE_LABELS[stage]}</span>
                </div>
                <h3 className="album-card-name">{card.name}</h3>
                <p className="album-ct">
                  {card.quantity} plants — {startingAmountLabel(card.name, card.quantity)}
                </p>
                {guide ? <p className="album-when px">{guide.timingLabel}</p> : null}
                <dl className="album-stats">
                  <dt>Spacing</dt>
                  <dd className="px">{card.spacing} in</dd>
                  <dt>Harvest</dt>
                  <dd className="px">{card.days ? `~${card.days} days` : "Varies"}</dd>
                  <dt>Sun</dt>
                  <dd className="px">{card.sun}</dd>
                </dl>
                {guide ? (
                  <details className="album-guide" id={`guide-${slugify(card.name)}`}>
                    <summary>Planting guide</summary>
                    <p>{guide.timingDetails}</p>
                    <dl>
                      <dt>How much to sow</dt>
                      <dd>{guide.sowingAmount || `Start a few extra seeds and thin to ${card.quantity} healthy plants.`}</dd>
                      {sizes.length ? (
                        <>
                          <dt>Space</dt>
                          <dd>{sizes.map((size) => `${size.bedName}: about ${size.width} × ${size.height} ft`).join("; ")}</dd>
                        </>
                      ) : null}
                      {guide.plantingDepth ? (<><dt>Depth</dt><dd>{guide.plantingDepth}</dd></>) : null}
                      {guide.watering ? (<><dt>Watering</dt><dd>{guide.watering}</dd></>) : null}
                    </dl>
                    {guide.notes ? <p className="album-guide-note">{guide.notes}</p> : null}
                  </details>
                ) : null}
                <div className="album-stamps no-print" role="group" aria-label={`${card.name} progress`}>
                  {STAMPS.map((stamp) => (
                    <button
                      key={stamp.id}
                      type="button"
                      className="album-stamp-btn px"
                      aria-pressed={active === stamp.id}
                      onClick={() => toggleStamp(key, stamp.id)}
                    >
                      {stamp.label}
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 3. What to do next, and how far along you are. */}
      <div className="album-lower">
        <section className="album-box" aria-labelledby="album-season-title">
          <h2 id="album-season-title">Season quests</h2>
          {levels.length ? (
            <ol className="album-levels">
              {levels.map((level, index) => (
                <li key={level.key} className="album-level">
                  <span className="album-level-num px" aria-hidden="true">{index + 1}</span>
                  <div>
                    <h3>
                      <span className="px">Stage {index + 1}:</span> {LEVEL_TITLES[level.key] ?? level.title}
                    </h3>
                    <ul className="album-quests">
                      {level.items.map((item) => {
                        const done = quests.includes(item.plantName.toLowerCase());
                        const id = `quest-${level.key}-${item.plantName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
                        return (
                          <li key={item.plantName} className={done ? "done" : undefined}>
                            <input id={id} type="checkbox" checked={done} onChange={() => toggleQuest(item.plantName)} />
                            <label htmlFor={id}>
                              {level.key === "now" ? "Plant" : level.key === "next_month" ? "Get ready to plant" : "Plan to plant"} {item.plantName}
                              <span className="album-quest-xp px"> +15 XP</span>
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p>No planting windows yet.</p>
          )}
        </section>

        <GardenerPanel />
      </div>

      {/* 4. The totals: the whole set fully grown, the only moving sprites on the page. */}
      <section className="album-totals" aria-labelledby="album-totals-title">
        <h2 id="album-totals-title" className="album-section-title">Your set at harvest</h2>
        <ul className="album-totals-row">
          {cards.map((card, index) => (
            <li key={card.name}>
              <PixelSprite plantName={card.name} motion="sway" delay={index * 0.2} />
              <span className="px">×{card.quantity}</span>
              <span className="album-totals-name">{card.name}</span>
            </li>
          ))}
        </ul>
        <div className="album-progress">
          <p className="px" id="album-progress-label">
            {collected} of {cards.length} cards collected · {totalPlants} plants
          </p>
          <div
            className="album-bar"
            role="progressbar"
            aria-labelledby="album-progress-label"
            aria-valuemin={0}
            aria-valuemax={cards.length}
            aria-valuenow={collected}
          >
            <i style={{ width: `${percent}%` }} />
          </div>
          <p className="album-hint">Stamp a card once it&apos;s in the ground to earn XP; its sprite grows from seed as the days pass.</p>
          </div>
        <p className="album-seed-note">
          Counts are healthy mature plants the space supports. Sow a few extra seeds and thin to the count; follow the
          packet for depth, since cultivars vary.
        </p>
      </section>
    </section>
  );
}

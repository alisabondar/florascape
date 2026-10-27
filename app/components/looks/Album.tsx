"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { groupGuideByTiming, startingAmountLabel } from "../../../lib/garden-plan";
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

  const toggleStamp = (name: string, stamp: Stamp) => {
    const turningOn = stamps[name] !== stamp;
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

      <div className="album-binder">
        <div className="album-page album-page-left">
          <p className="album-source px">{sourceLabel}</p>
          <h1 id="album-headline" className="album-headline">{headline}</h1>
          {plan.summary ? <p className="album-lead">{plan.summary}</p> : null}
          {inputSummary ? <p className="album-inputs">{inputSummary}</p> : null}
          <p className="album-count px">{totalPlants} plants across {cards.length} cards</p>
          {warning ? <p className="album-warning" role="note">{warning}</p> : null}
          <div className="album-progress">
            <p className="px" id="album-progress-label">{collected} of {cards.length} cards collected</p>
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
            <p className="album-hint">Stamp a card once it&apos;s in the ground to add it to your set and earn XP.</p>
          </div>
        </div>

        <div className="album-page album-page-right">
          <h2 className="album-sr">Plant cards</h2>
          <ul className="album-sleeves">
            {cards.map((card, index) => {
              const colors = RARITY_COLORS[card.rarity];
              const key = card.name.toLowerCase();
              const active = stamps[key];
              const activeLabel = STAMPS.find((s) => s.id === active)?.label;
              const style = { "--rar": colors.rar, "--bg": colors.bg } as CSSProperties;
              return (
                <li key={key} className="album-card" style={style}>
                  <span className="album-rarity px">{card.rarity}</span>
                  {activeLabel ? <span className={`album-stamp-mark is-${active}`} aria-hidden="true">{activeLabel}</span> : null}
                  <div className="album-art" aria-hidden="true">
                    <PixelSprite plantName={card.name} motion="grow" delay={index * 0.15} />
                  </div>
                  <h3 className="album-card-name">
                    <button type="button" className="album-name-btn" onClick={() => onOpenGuide(card.firstGroup)}>
                      {card.name}
                    </button>
                  </h3>
                  <p className="album-ct">
                    {card.quantity} plants — {startingAmountLabel(card.name, card.quantity)}
                  </p>
                  <dl className="album-stats">
                    <dt>Spacing</dt>
                    <dd className="px">{card.spacing} in</dd>
                    <dt>Harvest</dt>
                    <dd className="px">{card.days ? `~${card.days} days` : "Varies"}</dd>
                    <dt>Sun</dt>
                    <dd className="px">{card.sun}</dd>
                  </dl>
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
        </div>
      </div>

      <div className="album-lower">
        <section className="album-box album-plot" aria-labelledby="album-plot-title">
          <h2 id="album-plot-title">The bed these cards fill</h2>
          <BedEditor
            layout={plan.layout}
            alternatives={plan.alternatives}
            onLayoutChange={onLayoutChange}
            onSwapPlant={onSwapPlant}
            onSwapZones={onSwapZones}
            onZoneSelect={onOpenGuide}
          />
        </section>

        <GardenerPanel />

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

        {climate ? (
          <section className="album-box album-turf" aria-labelledby="album-turf-title">
            <h2 id="album-turf-title">Home turf</h2>
            <dl className="album-stats">
              <dt>Zone</dt>
              <dd className="px">{climate.hardinessZone || "Unknown"}</dd>
              {climate.frost ? (
                <>
                  <dt>Last spring frost</dt>
                  <dd className="px">{formatMonthDay(climate.frost.lastSpringFrost)}</dd>
                  <dt>First fall frost</dt>
                  <dd className="px">{formatMonthDay(climate.frost.firstFallFrost)}</dd>
                  <dt>Season</dt>
                  <dd className="px">{climate.frost.growingSeasonDays} days</dd>
                </>
              ) : null}
            </dl>
          </section>
        ) : null}
      </div>
    </section>
  );
}

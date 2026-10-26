"use client";

import { useMemo } from "react";
import PixelPlot from "../PixelPlot";
import PixelSprite from "../PixelSprite";
import { groupGuideByTiming, seasonLabel, startingAmountLabel } from "../../../lib/garden-plan";
import { findPlantFacts } from "../../../lib/plant-facts";
import type { FrostDates, GuideEntry, Plant } from "../../../lib/types";
import type { LookDashboardProps } from "./types";
import "./quest-binder.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const LEVEL_NAMES: Record<string, string> = { now: "Plant now", next_month: "Next month", next_season: "Later" };
const DAY_MS = 86_400_000;

function formatMonthDay(value: string | null): string | null {
  const match = value ? /^(\d{2})-(\d{2})$/.exec(value) : null;
  if (!match) return null;
  const month = Number(match[1]) - 1;
  return MONTHS[month] ? `${MONTHS[month]} ${Number(match[2])}` : null;
}

function seasonReadout(frost: FrostDates | null, today: Date): string | null {
  const match = frost?.lastSpringFrost ? /^(\d{2})-(\d{2})$/.exec(frost.lastSpringFrost) : null;
  if (!frost || !match || !(frost.growingSeasonDays > 0)) return null;
  const start = new Date(today.getFullYear(), Number(match[1]) - 1, Number(match[2]));
  const day = Math.floor((today.getTime() - start.getTime()) / DAY_MS) + 1;
  if (day < 1) return `Season starts in ${1 - day} ${1 - day === 1 ? "day" : "days"}`;
  if (day > frost.growingSeasonDays) return `Off-season · ${frost.growingSeasonDays}-day season`;
  return `Day ${day} of ${frost.growingSeasonDays}`;
}

export default function QuestBinderDashboard({
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
}: LookDashboardProps) {
  const plants = plan.layout.plants;
  const levels = useMemo(() => groupGuideByTiming(plan.plantingGuide), [plan.plantingGuide]);
  const bedNames = useMemo(() => new Map(plan.layout.beds.map((bed) => [bed.id, bed.name])), [plan.layout.beds]);

  const today = new Date();
  const frostFree = formatMonthDay(climate?.frost?.lastSpringFrost ?? null);
  const readout = seasonReadout(climate?.frost ?? null, today);
  const totalPlants = plants.reduce((sum, plant) => sum + (Number(plant.quantity) || 0), 0);

  const plantFor = (entry: GuideEntry): Plant | undefined =>
    plants.find((plant) => plant.guideId === entry.id) ??
    plants.find((plant) => plant.name.toLowerCase() === entry.plantName.toLowerCase());

  return (
    <section className="look-dashboard qb-dashboard" aria-labelledby="qb-title">
      <header className="qb-hud" aria-label="Garden status">
        <span className="qb-hud-chip">
          <span className="qb-hud-key">Season</span> {seasonLabel(today)}
        </span>
        {climate?.hardinessZone ? (
          <span className="qb-hud-chip">
            <span className="qb-hud-key">Zone</span> {climate.hardinessZone}
          </span>
        ) : null}
        {frostFree ? (
          <span className="qb-hud-chip">
            <span className="qb-hud-key">Frost-free</span> {frostFree}
          </span>
        ) : null}
        {readout ? (
          <span className="qb-hud-chip qb-hud-day">
            <span className="qb-hud-key">Clock</span> {readout}
          </span>
        ) : null}
        <span className="qb-hud-chip qb-hud-source">{sourceLabel}</span>
      </header>

      <div className="qb-grid">
        <nav className="qb-map qb-panel" aria-labelledby="qb-map-title">
          <h2 id="qb-map-title" className="qb-panel-title">Season map</h2>
          {levels.length ? (
            <ol className="qb-levels">
              {levels.map((level, index) => (
                <li className={`qb-level${index === 0 ? " is-current" : ""}`} key={level.key}>
                  <div className="qb-level-node" aria-hidden="true">{index + 1}</div>
                  <div className="qb-level-body">
                    <h3 className="qb-level-title">
                      Lv {index + 1} · {LEVEL_NAMES[level.key] ?? level.title}
                      {index === 0 ? <span className="qb-level-badge">Current</span> : null}
                    </h3>
                    <ul className="qb-level-plants">
                      {level.items.map((entry) => {
                        const plant = plantFor(entry);
                        return (
                          <li key={entry.id}>
                            <button
                              type="button"
                              className="qb-level-plant no-print"
                              disabled={!plant}
                              onClick={() => plant && onOpenGuide(plant)}
                            >
                              <PixelSprite plantName={entry.plantName} scale={1} motion="still" />
                              <span>{entry.plantName}</span>
                              <span className="qb-count">×{entry.quantity}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="qb-empty">No quests yet.</p>
          )}
        </nav>

        <div className="qb-stage">
          <div className="qb-headline">
            <p className="qb-kicker">{inputSummary || "Your garden"}</p>
            <h1 id="qb-title">Your garden quest</h1>
            <p className="qb-summary">{plan.summary}</p>
          </div>
          {warning ? (
            <div className="qb-npc" role="note">
              <span className="qb-npc-name" aria-hidden="true">Old Gardener</span>
              <p>{warning}</p>
            </div>
          ) : null}
          <div className="qb-viewport">
            <div className="qb-viewport-bar" aria-hidden="true">
              <span>World map</span>
              <span>{totalPlants} plants</span>
            </div>
            <PixelPlot layout={plan.layout} onZoneSelect={onOpenGuide} />
          </div>
          <div className="qb-actions no-print">
            {canShuffle ? (
              <button type="button" className="qb-btn qb-btn-accent" onClick={onShuffle}>Shuffle</button>
            ) : null}
            <button type="button" className="qb-btn" onClick={onCalendar}>Add to calendar</button>
            <button type="button" className="qb-btn" onClick={onPrint}>Print</button>
            <a className="qb-btn" href={editHref}>Edit inputs</a>
          </div>
        </div>
      </div>

      <section className="qb-inventory qb-panel" aria-labelledby="qb-inv-title">
        <h2 id="qb-inv-title" className="qb-panel-title">
          Inventory <span className="qb-count">{plants.length} cards</span>
        </h2>
        <ul className="qb-cards">
          {plants.map((plant, index) => {
            const facts = findPlantFacts(plant.name);
            return (
              <li key={plant.id}>
                <button type="button" className="qb-card" onClick={() => onOpenGuide(plant)}>
                  <span className="qb-card-art">
                    <PixelSprite plantName={plant.name} scale={3} motion="sway" delay={index * 0.15} />
                  </span>
                  <span className="qb-card-name">{plant.name}</span>
                  <span className="qb-card-qty">×{plant.quantity}</span>
                  <span className="qb-card-amount">{startingAmountLabel(plant.name, plant.quantity)}</span>
                  <span className="qb-card-stats">
                    <span title="Spacing">↔ {plant.spacingInches || facts?.spacingInches.min || "?"}in</span>
                    <span title="Days to harvest">⏱ {facts ? `${facts.daysToMaturity}d` : "—"}</span>
                  </span>
                  <span className="qb-card-bed">{bedNames.get(plant.bedId) ?? "Garden"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </section>
  );
}

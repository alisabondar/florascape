"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { groupGuideByTiming, startingAmountLabel } from "../../../lib/garden-plan";
import { findPlantFacts } from "../../../lib/plant-facts";
import type { GuideEntry, Plant, PlantCategory } from "../../../lib/types";
import PixelPlot from "../PixelPlot";
import PixelSprite from "../PixelSprite";
import type { LookDashboardProps } from "./types";
import "./seed-rack.css";

interface Packet {
  key: string;
  plant: Plant;
  name: string;
  quantity: number;
  category: PlantCategory | "other";
  guide: GuideEntry | undefined;
}

const TIMING_CHIP: Record<string, string> = { now: "Plant now", next_month: "Next month" };
const SUN_LABEL: Record<string, string> = { full_sun: "Full sun", partial_shade: "Part shade", shade: "Shade" };
const FROST_LABEL: Record<string, string> = { tender: "Frost tender", semi_hardy: "Semi-hardy", hardy: "Frost hardy" };

function rackTitle(packets: Packet[]): string {
  if (!packets.length) return "Your Seed Rack";
  const names = packets.slice(0, 2).map((p) => p.name);
  // "Tomato & Basil", or "Tomato, Basil & 4 more" when there are more packets.
  return packets.length > 2 ? `${names.join(", ")} & ${packets.length - 2} more` : names.join(" & ");
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function SeedRackDashboard({
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
  const packets = useMemo<Packet[]>(() => {
    const byName = new Map<string, Packet>();
    for (const plant of plan.layout.plants) {
      const key = plant.name.trim().toLowerCase();
      const existing = byName.get(key);
      if (existing) {
        existing.quantity += Number(plant.quantity) || 0;
        continue;
      }
      byName.set(key, {
        key,
        plant,
        name: plant.name,
        quantity: Number(plant.quantity) || 0,
        category: findPlantFacts(plant.name)?.category ?? "other",
        guide: plan.plantingGuide.find((g) => g.plantName.trim().toLowerCase() === key),
      });
    }
    return [...byName.values()].filter((p) => p.quantity > 0);
  }, [plan.layout.plants, plan.plantingGuide]);

  const todoGroups = useMemo(() => groupGuideByTiming(plan.plantingGuide), [plan.plantingGuide]);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const frost = climate?.frost ?? null;
  const forecast = climate?.forecast ?? null;

  return (
    <section className="look-dashboard look-seed-rack-dashboard" aria-labelledby="sr-title">
      <header className="sr-sign">
        <p className="sr-sign-eyebrow">FloraScape Garden Center · {sourceLabel}</p>
        <h1 id="sr-title" className="sr-sign-title">{rackTitle(packets)}</h1>
        {plan.summary ? <p className="sr-sign-summary">{plan.summary}</p> : null}
        {inputSummary ? <p className="sr-sign-inputs">{inputSummary}</p> : null}
        {warning ? (
          <p className="sr-hangtag" role="note">
            {warning}
          </p>
        ) : null}
      </header>

      <div className="sr-actions no-print" role="group" aria-label="Plan actions">
        {canShuffle ? (
          <button type="button" className="sr-tag" onClick={onShuffle}>Shuffle</button>
        ) : null}
        <button type="button" className="sr-tag" onClick={onCalendar}>Add to calendar</button>
        <button type="button" className="sr-tag" onClick={onPrint}>Print</button>
        <a className="sr-tag" href={editHref}>Edit inputs</a>
      </div>

      <section className="sr-rack" aria-labelledby="sr-rack-title">
        <h2 id="sr-rack-title" className="sr-h2">On the rack <span className="sr-num">{packets.length}</span></h2>
        <ul className="sr-shelf">
          {packets.map((packet, index) => {
            const facts = findPlantFacts(packet.name);
            const timing = packet.guide ? TIMING_CHIP[packet.guide.whenToPlant] ?? "Later" : null;
            return (
              <li key={packet.key} className={`sr-packet cat-${packet.category}`} style={{ "--i": index } as CSSProperties}>
                <div className="sr-flap" aria-hidden="true">
                  <span>{packet.category === "other" ? "seeds" : packet.category}</span>
                </div>
                <div className="sr-art">
                  <PixelSprite plantName={packet.name} scale={5} motion="grow" delay={index * 0.15} />
                </div>
                <h3 className="sr-packet-name">
                  <button type="button" onClick={() => onOpenGuide(packet.plant)}>{packet.name}</button>
                </h3>
                <p className="sr-packet-count">
                  <span className="sr-num">{packet.quantity}</span> plants — {startingAmountLabel(packet.name, packet.quantity)}
                </p>
                {timing ? <p className={`sr-chip timing-${packet.guide?.whenToPlant ?? "later"}`}>{timing}</p> : null}
                <details className="sr-directions">
                  <summary className="no-print">Directions</summary>
                  <dl>
                    <dt>Spacing</dt>
                    <dd>{packet.guide?.spacingInches ?? packet.plant.spacingInches}&Prime;</dd>
                    {facts ? (
                      <>
                        <dt>Harvest</dt>
                        <dd>~{facts.daysToMaturity} days</dd>
                        <dt>Sun</dt>
                        <dd>{SUN_LABEL[facts.sunNeeds] ?? facts.sunNeeds}</dd>
                        <dt>Frost</dt>
                        <dd>{FROST_LABEL[facts.frostTolerance] ?? facts.frostTolerance}</dd>
                      </>
                    ) : (
                      <>
                        <dt>Sun</dt>
                        <dd>{SUN_LABEL[packet.plant.sunNeeds] ?? packet.plant.sunNeeds}</dd>
                      </>
                    )}
                  </dl>
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="sr-lower">
        <section className="sr-crate" aria-labelledby="sr-crate-title">
          <h2 id="sr-crate-title" className="sr-h2">Where they go</h2>
          <div className="sr-crate-inner">
            <PixelPlot layout={plan.layout} onZoneSelect={onOpenGuide} />
          </div>
        </section>

        <div className="sr-side">
          {climate ? (
            <section className="sr-postmark" aria-labelledby="sr-postmark-title">
              <h2 id="sr-postmark-title" className="sr-h3">Frost postmark</h2>
              <p className="sr-stamp">
                <span>Zone</span>
                <strong className="sr-num">{climate.hardinessZone || "?"}</strong>
              </p>
              {frost ? (
                <dl className="sr-frost">
                  <dt>Last spring frost</dt>
                  <dd className="sr-num">{formatDate(frost.lastSpringFrost)}</dd>
                  <dt>First fall frost</dt>
                  <dd className="sr-num">{formatDate(frost.firstFallFrost)}</dd>
                  <dt>Season</dt>
                  <dd><span className="sr-num">{frost.growingSeasonDays}</span> days</dd>
                </dl>
              ) : null}
              {forecast?.frostWarning ? (
                <p className="sr-frost-warning" role="alert">
                  Frost in the forecast{forecast.frostDays.length ? `: ${forecast.frostDays.map((d) => formatDate(d)).join(", ")}` : ""}. Cover tender plants.
                </p>
              ) : null}
            </section>
          ) : null}

          {todoGroups.length ? (
            <section className="sr-todo" aria-labelledby="sr-todo-title">
              <h2 id="sr-todo-title" className="sr-h3">To do</h2>
              {todoGroups.map((group) => (
                <div key={group.key} className="sr-todo-group">
                  <h3>{group.title}</h3>
                  <ul>
                    {group.items.map((item) => {
                      const id = `sr-todo-${item.id}`;
                      return (
                        <li key={item.id}>
                          <input
                            id={id}
                            type="checkbox"
                            className="no-print"
                            checked={Boolean(done[item.id])}
                            onChange={(e) => setDone((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                          />
                          <label htmlFor={id}>
                            {item.plantName} <span className="sr-num">×{item.quantity}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </section>
          ) : null}
        </div>
      </div>
    </section>
  );
}

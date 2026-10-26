import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import PixelPlot from "../PixelPlot";
import PixelSprite from "../PixelSprite";
import { groupGuideByTiming, seasonLabel, startingAmountLabel } from "../../../lib/garden-plan";
import type { GuideEntry, Plant } from "../../../lib/types";
import type { LookDashboardProps } from "./types";
import "./quests.css";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FLAPS = ["#a33224", "#3f6b35", "#e3a72f", "#c46a2a", "#7a4a8a", "#2d5d7a", "#b5737a", "#55703e"];

function formatMonthDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = /^(\d{1,2})-(\d{1,2})$/.exec(value);
  if (!match) return value;
  const month = MONTHS[Number(match[1]) - 1];
  return month ? `${month} ${Number(match[2])}` : value;
}

function formatDay(value: string): string {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

function plantForGuide(entry: GuideEntry, plants: Plant[]): Plant | undefined {
  const name = entry.plantName.toLowerCase();
  return plants.find((p) => p.guideId === entry.id) ?? plants.find((p) => p.name.toLowerCase() === name);
}

export default function QuestsDashboard({
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
  const [done, setDone] = useState<Record<string, boolean>>({});
  const plants = plan.layout.plants;
  const groups = useMemo(() => groupGuideByTiming(plan.plantingGuide), [plan.plantingGuide]);
  const bedNames = useMemo(() => new Map(plan.layout.beds.map((b) => [b.id, b.name])), [plan.layout.beds]);
  const totalPlants = plants.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const season = seasonLabel(new Date());
  const zone = climate?.hardinessZone || null;
  const springFrost = formatMonthDay(climate?.frost?.lastSpringFrost);
  const fallFrost = formatMonthDay(climate?.frost?.firstFallFrost);
  const frostDays = climate?.forecast?.frostWarning ? climate.forecast.frostDays : [];
  const questCount = groups.reduce((sum, g) => sum + g.items.length, 0);
  const doneCount = groups.reduce((sum, g) => sum + g.items.filter((i) => done[i.id]).length, 0);

  return (
    <section className="look-dashboard look-quests-dashboard" aria-labelledby="quests-headline">
      <div className="qp-status" role="status" aria-label="Garden status">
        <span className="qp-brand">FloraScape</span>
        <span>{season}</span>
        {zone ? <span className="qp-px">Zone {zone}</span> : null}
        {springFrost ? <span>Last frost <span className="qp-px">{springFrost}</span></span> : null}
        {fallFrost ? <span>First frost <span className="qp-px">{fallFrost}</span></span> : null}
        <span className="qp-badge">{sourceLabel}</span>
      </div>

      <div className="qp-grid">
        <article className="qp-env qp-hero" style={{ "--flap": "#a33224" } as CSSProperties}>
          <div className="qp-flap" aria-hidden="true" />
          <h1 id="quests-headline" className="qp-headline">
            Your first quest: <span className="qp-px">{plants.length}</span> plant group{plants.length === 1 ? "" : "s"},{" "}
            <span className="qp-px">{totalPlants}</span> plant{totalPlants === 1 ? "" : "s"}
          </h1>
          {plan.summary ? <p className="qp-summary">{plan.summary}</p> : null}
          {inputSummary ? <p className="qp-inputs">{inputSummary}</p> : null}
          {warning ? <p className="qp-note" role="note">{warning}</p> : null}
          <div className="qp-stamps no-print" role="group" aria-label="Plan actions">
            {canShuffle ? (
              <button type="button" className="qp-stamp" onClick={onShuffle}>Shuffle</button>
            ) : null}
            <button type="button" className="qp-stamp" onClick={onCalendar}>Add to calendar</button>
            <button type="button" className="qp-stamp" onClick={onPrint}>Print</button>
            <Link className="qp-stamp" href={editHref}>Edit inputs</Link>
          </div>
        </article>

        <article className="qp-env qp-log" style={{ "--flap": "#3f6b35" } as CSSProperties} aria-labelledby="qp-log-title">
          <div className="qp-flap" aria-hidden="true" />
          <h2 id="qp-log-title" className="qp-title">
            Quest log <span className="qp-px qp-count">{doneCount}/{questCount}</span>
          </h2>
          {groups.length === 0 ? <p>No planting quests yet.</p> : null}
          {groups.map((group) => (
            <div className="qp-group" key={group.key}>
              <h3 className="qp-subtitle">
                {group.title} <span className="qp-px">({group.plantCount})</span>
              </h3>
              <ul className="qp-quests">
                {group.items.map((item) => {
                  const plant = plantForGuide(item, plants);
                  const checkId = `qp-check-${item.id}`;
                  return (
                    <li key={item.id} className={done[item.id] ? "is-done" : undefined}>
                      <input
                        id={checkId}
                        type="checkbox"
                        className="no-print"
                        checked={Boolean(done[item.id])}
                        onChange={(e) => setDone((prev) => ({ ...prev, [item.id]: e.target.checked }))}
                        aria-label={`Mark ${item.plantName} planted`}
                      />
                      <PixelSprite plantName={item.plantName} motion="still" scale={2} />
                      {plant ? (
                        <button type="button" className="qp-link" onClick={() => onOpenGuide(plant)}>
                          {item.plantName}
                        </button>
                      ) : (
                        <span className="qp-name">{item.plantName}</span>
                      )}
                      <span className="qp-px qp-qty">×{item.quantity}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </article>

        <article className="qp-env qp-plot" style={{ "--flap": "#e3a72f" } as CSSProperties} aria-labelledby="qp-plot-title">
          <div className="qp-flap" aria-hidden="true" />
          <h2 id="qp-plot-title" className="qp-title">Your plot</h2>
          <PixelPlot layout={plan.layout} onZoneSelect={onOpenGuide} />
        </article>

        <article className="qp-env qp-weather" style={{ "--flap": "#2d5d7a" } as CSSProperties} aria-labelledby="qp-weather-title">
          <div className="qp-flap" aria-hidden="true" />
          <div className="qp-postmark">
            <h2 id="qp-weather-title" className="qp-title">Weather post</h2>
            {climate ? (
              <dl className="qp-facts">
                {zone ? (<><dt>Zone</dt><dd className="qp-px">{zone}</dd></>) : null}
                {springFrost ? (<><dt>Last spring frost</dt><dd className="qp-px">{springFrost}</dd></>) : null}
                {fallFrost ? (<><dt>First fall frost</dt><dd className="qp-px">{fallFrost}</dd></>) : null}
                {climate.temperatureRange ? (<><dt>Temps</dt><dd className="qp-px">{climate.temperatureRange}</dd></>) : null}
              </dl>
            ) : (
              <p>No local weather on file.</p>
            )}
            {frostDays.length ? (
              <p className="qp-note" role="note">
                Frost warning: <span className="qp-px">{frostDays.map(formatDay).join(", ")}</span>
              </p>
            ) : null}
          </div>
        </article>

        <article className="qp-env qp-inv" style={{ "--flap": "#c46a2a" } as CSSProperties} aria-labelledby="qp-inv-title">
          <div className="qp-flap" aria-hidden="true" />
          <h2 id="qp-inv-title" className="qp-title">Inventory</h2>
          <ul className="qp-slots">
            {plants.map((plant, index) => (
              <li key={plant.id} className="qp-slot" style={{ "--flap": FLAPS[index % FLAPS.length] } as CSSProperties}>
                <PixelSprite plantName={plant.name} motion="sway" delay={index * 0.15} />
                <span className="qp-px qp-qty">×{plant.quantity}</span>
                <span className="qp-slot-name">{plant.name}</span>
                <span className="qp-slot-meta">{startingAmountLabel(plant.name, plant.quantity)}</span>
                <span className="qp-slot-meta">{bedNames.get(plant.bedId) || ""}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}

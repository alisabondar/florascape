"use client";

import { History, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  addSeason,
  previousSeason,
  removeSeason,
  ROTATION_GROUP_LABELS,
  rotationCheck,
  snapshotSeason,
} from "../../lib/garden-plan";
import { recordProgress } from "./progress/store";
import { GARDEN_HISTORY_KEY, readLocalJson, writeLocalJson } from "../../lib/session-storage";
import type { GardenPlan, SavedSeason } from "../../lib/types";

interface CropRotationProps {
  plan: GardenPlan;
  planId: string;
  zipCode?: string;
  onApplySwap: (plantId: string, plantName: string) => void;
}

/** Season history on this device plus a rotation check against the most recent other season. */
export default function CropRotation({ plan, planId, zipCode, onApplySwap }: CropRotationProps) {
  const [history, setHistory] = useState<SavedSeason[]>([]);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    const saved = readLocalJson(GARDEN_HISTORY_KEY);
    setHistory(Array.isArray(saved) ? (saved as SavedSeason[]) : []);
  }, []);

  function updateHistory(next: SavedSeason[]) {
    setHistory(next);
    writeLocalJson(GARDEN_HISTORY_KEY, next);
  }

  const earlier = useMemo(() => previousSeason(history, planId), [history, planId]);
  const check = useMemo(() => rotationCheck(plan, earlier), [plan, earlier]);

  function saveSeason() {
    updateHistory(addSeason(history, snapshotSeason({ plan, planId, zipCode })));
    setJustSaved(true);
    recordProgress({ kind: "season-saved", key: `season:${planId}` });
    // Keeping rotation: saving a plan that repeats no crop family from the previous season.
    if (earlier && check.length === 0) {
      recordProgress({ kind: "rotation-kept", key: `rotation:${planId}` });
    }
  }
  const currentSaved = history.some((entry) => entry.planId === planId);

  return (
    <section className="result-content-section rotation-section print-section" aria-labelledby="rotation-title">
      <div className="result-section-heading">
        <span>06</span>
        <div>
          <h2 id="rotation-title">Crop rotation</h2>
          <p>
            Save each season on this device. Next time, FloraScape checks whether a crop family is
            returning to the same area, which can build up soil pests and disease.
          </p>
        </div>
      </div>

      <div className="rotation-actions no-print">
        <button type="button" className="btn secondary-action" onClick={saveSeason}>
          <Save size={16} aria-hidden="true" />
          {currentSaved ? "Update saved season" : "Save this season"}
        </button>
        {justSaved ? <span role="status">Saved on this device.</span> : null}
      </div>

      {earlier ? (
        <div className="rotation-check">
          <h3>
            <History size={16} aria-hidden="true" /> Compared with {earlier.label}
          </h3>
          {check.length ? (
            check.map((area) => (
              <article className="rotation-area" key={area.bedId}>
                <h4>{area.bedName}</h4>
                <ul>
                  {area.repeats.map((repeat) => (
                    <li key={repeat.plantId}>
                      {repeat.plant.toLowerCase() === repeat.earlierPlant.toLowerCase() ? (
                        <>
                          <strong>{repeat.plant}</strong> also grew here in {earlier.label}.
                        </>
                      ) : (
                        <>
                          <strong>{repeat.plant}</strong> is in the same rotation group as{" "}
                          <strong>{repeat.earlierPlant}</strong>, which grew here in {earlier.label}.
                        </>
                      )}
                    </li>
                  ))}
                </ul>
                {area.recommendedGroup ? (
                  <p className="rotation-next">
                    Aim for {ROTATION_GROUP_LABELS[area.recommendedGroup]} here next, after{" "}
                    {area.lastGroup ? ROTATION_GROUP_LABELS[area.lastGroup] : null} last time.
                  </p>
                ) : null}
                {area.suggestions.length ? (
                  <div className="rotation-swaps no-print">
                    {area.suggestions.map((suggestion) => (
                      <button
                        type="button"
                        key={suggestion.plantId}
                        onClick={() => onApplySwap(suggestion.plantId, suggestion.replacement)}
                      >
                        Swap {suggestion.from} → {suggestion.replacement}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <p className="rotation-ok">No crop family repeats in the same area. Nice rotation!</p>
          )}
        </div>
      ) : (
        <p className="rotation-empty">
          {history.length
            ? "Only this plan is saved so far. Save next season's plan to see a rotation check."
            : "No seasons saved yet."}
        </p>
      )}

      {history.length ? (
        <div className="rotation-history no-print">
          <h3>Saved seasons</h3>
          <ul>
            {history.map((entry) => (
              <li key={entry.id}>
                <span>
                  <strong>{entry.label}</strong> · {entry.zipCode || "no ZIP"} · {entry.areas.length}{" "}
                  {entry.areas.length === 1 ? "area" : "areas"}
                  {entry.planId === planId ? " · this plan" : ""}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    updateHistory(removeSeason(history, entry.id));
                    setJustSaved(false);
                  }}
                  aria-label={`Remove ${entry.label} season`}
                >
                  <Trash2 size={15} aria-hidden="true" />
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

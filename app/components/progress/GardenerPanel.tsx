"use client";

import { BADGES, levelFor } from "../../../lib/progress";
import { useGardenerProgress } from "./store";
import "./progress.css";

/** Level, XP toward the next level, and the badge shelf. */
export default function GardenerPanel() {
  const progress = useGardenerProgress();
  const level = levelFor(progress.xp);
  const percent = Math.round(level.progress * 100);
  return (
    <section className="gardener-panel" aria-labelledby="gardener-title">
      <div className="gardener-level">
        <span className="gardener-level-num px" aria-hidden="true">
          {level.level}
        </span>
        <div>
          <h2 id="gardener-title">
            Level {level.level} · {level.title}
          </h2>
          <p className="gardener-xp px">
            {progress.xp} XP{level.next ? ` · ${level.xpToNext} to ${level.next.title}` : " · top level"}
          </p>
          <div
            className="gardener-bar"
            role="progressbar"
            aria-label="Progress to the next level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
          >
            <i style={{ width: `${percent}%` }} />
          </div>
        </div>
      </div>
      <p className="gardener-how">
        Earn XP by stamping cards, finishing planting quests, saving seasons, and keeping your crop rotation.
      </p>
      <ul className="gardener-badges" aria-label="Badges">
        {BADGES.map((badge) => {
          const earned = progress.badges.includes(badge.id);
          return (
            <li key={badge.id} className={earned ? "earned" : "locked"} title={badge.description}>
              <span className="gardener-badge-icon" aria-hidden="true">
                {earned ? "★" : "?"}
              </span>
              <span className="gardener-badge-name">{badge.title}</span>
              <span className="album-sr">{earned ? `earned: ${badge.description}` : `locked: ${badge.description}`}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

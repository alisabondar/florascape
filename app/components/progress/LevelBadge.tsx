"use client";

import { levelFor } from "../../../lib/progress";
import { useGardenerProgress } from "./store";
import "./progress.css";

/** Compact "Lv 3 · Seedling Sitter" chip with an XP bar, for the top bar. */
export default function LevelBadge() {
  const progress = useGardenerProgress();
  const level = levelFor(progress.xp);
  return (
    <span
      className="level-badge"
      title={level.next ? `${progress.xp} XP · ${level.xpToNext} XP to ${level.next.title}` : `${progress.xp} XP · top level`}
    >
      <span className="level-badge-num px">Lv {level.level}</span>
      <span className="level-badge-title">{level.title}</span>
      <span
        className="level-badge-bar"
        role="progressbar"
        aria-label={`Gardener level ${level.level}, ${level.title}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(level.progress * 100)}
      >
        <i style={{ width: `${Math.round(level.progress * 100)}%` }} />
      </span>
    </span>
  );
}

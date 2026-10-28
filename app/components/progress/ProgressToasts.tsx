"use client";

import { useEffect, useState } from "react";
import { levelFor } from "../../../lib/progress";
import type { AwardResult } from "../../../lib/progress";
import { PROGRESS_EVENT } from "./store";
import "./progress.css";

interface Toast {
  id: number;
  text: string;
  kind: "xp" | "level" | "badge";
}

/** Short pop-ups for XP, level-ups, and new badges. Announced politely to screen readers. */
export default function ProgressToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let nextId = 1;
    function onProgress(event: Event) {
      const result = (event as CustomEvent<AwardResult>).detail;
      const added: Toast[] = [];
      if (result.xpGained > 0) added.push({ id: nextId++, text: `+${result.xpGained} XP`, kind: "xp" });
      if (result.leveledUp) {
        const level = levelFor(result.state.xp);
        added.push({ id: nextId++, text: `Level up! Level ${level.level} · ${level.title}`, kind: "level" });
      }
      result.newBadges.forEach((badge) => added.push({ id: nextId++, text: `Badge: ${badge.title}`, kind: "badge" }));
      if (!added.length) return;
      setToasts((current) => [...current, ...added].slice(-4));
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => !added.some((item) => item.id === toast.id)));
      }, 3600);
    }
    window.addEventListener(PROGRESS_EVENT, onProgress);
    return () => window.removeEventListener(PROGRESS_EVENT, onProgress);
  }, []);

  return (
    <div className="progress-toasts no-print" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <p key={toast.id} className={`progress-toast ${toast.kind}`}>
          {toast.text}
        </p>
      ))}
    </div>
  );
}

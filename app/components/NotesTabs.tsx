"use client";

import { useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export interface NotesTab {
  id: string;
  label: string;
  content: ReactNode;
}

interface NotesTabsProps {
  title: string;
  tabs: NotesTab[];
}

/**
 * Tabs for the secondary results sections (WAI-ARIA tabs pattern: arrow keys move
 * between tabs, only the active panel shows). Every panel prints.
 */
export default function NotesTabs({ title, tabs }: NotesTabsProps) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const step = { ArrowRight: 1, ArrowLeft: -1, Home: -index, End: tabs.length - 1 - index }[event.key];
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    const next = (index + step + tabs.length) % tabs.length;
    setActive(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <section className="notes-tabs" aria-labelledby={`${baseId}-title`}>
      <h2 id={`${baseId}-title`} className="notes-tabs-title">{title}</h2>
      <div className="notes-tablist no-print" role="tablist" aria-labelledby={`${baseId}-title`}>
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${baseId}-tab-${tab.id}`}
            aria-selected={active === tab.id}
            aria-controls={`${baseId}-panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-panel-${tab.id}`}
          aria-labelledby={`${baseId}-tab-${tab.id}`}
          className="notes-panel"
          hidden={active !== tab.id}
          tabIndex={0}
        >
          {tab.content}
        </div>
      ))}
    </section>
  );
}

"use client";

import { Leaf, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import CropRotation from "../../components/CropRotation";
import GardenChat from "../../components/GardenChat";
import AlbumDashboard from "../../components/looks/Album";
import AlbumShelf from "../../components/albums/AlbumShelf";
import NotesTabs from "../../components/NotesTabs";
import { saveAlbum } from "../../components/albums/store";
import NavAlbumsLink from "../../components/albums/NavAlbumsLink";
import LevelBadge from "../../components/progress/LevelBadge";
import { recordProgress } from "../../components/progress/store";
import PixelSprite from "../../components/PixelSprite";
import "./result-states.css";
import {
  downloadPlantingCalendar,
  NeighborCheck,
  ShoppingList,
} from "../../components/PlanExtras";
import {
  createExampleGardenPlan,
  createFallbackGardenPlan,
  shufflePlan,
  slugify,
  swapPlant,
  swapZones,
} from "../../../lib/garden-plan";
import { LOADING_STAGES, providerLabel, readPlanStream } from "../../../lib/plan/read-plan-stream";
import {
  getAreaCopy,
  getGardenMethodLabel,
} from "../../../lib/planner-config";
import {
  PLANNER_RESULT_KEY,
  readSessionJson,
  writeSessionJson,
} from "../../../lib/session-storage";
import type {
  ChatMessage,
  ClimateContext,
  GardenPlan,
  GrowingUnitInput,
  InGroundInput,
  Layout,
  PlannerInput,
  PlanResponseBody,
  PlanTips,
  StoredPlannerResult,
  TipItem,
} from "../../../lib/types";

/** A progress event from the plan stream ("climate", "generating", "result", ...). */
interface PlanProgressEvent {
  type: string;
  provider?: string;
}

type GenerateResponse = Partial<PlanResponseBody> & { error?: string };

type PlanTransform = (plan: GardenPlan, options: { climate: ClimateContext | null }) => GardenPlan;

type TipGroupKey = "preferenceHelp" | "companionPlanting" | "avoid" | "watering" | "commonMistakes";

/** Results are written only by the planner pages, so any stored object is taken as one. */
function isStoredResult(value: unknown): value is StoredPlannerResult {
  return typeof value === "object" && value !== null;
}

function readStoredResult(): StoredPlannerResult | null {
  const value: unknown = readSessionJson(PLANNER_RESULT_KEY);
  return isStoredResult(value) ? value : null;
}

function inputSummary(input: PlannerInput | undefined) {
  if (!input) {
    return "Example garden";
  }
  if (input.gardenType === "in_ground") {
    // In-ground inputs always carry inGround details (see the planner submit handler).
    const inGround = input.inGround as InGroundInput;
    const sections = inGround.sectionCount === 1
      ? "one plot"
      : `${inGround.sectionCount} sections`;
    return `${input.zipCode} · In-ground · ${inGround.width} × ${inGround.length} ft · ${sections}`;
  }
  const areaCopy = getAreaCopy(input.gardenType);
  const sizes = input.units.map((unit: GrowingUnitInput) => `${unit.width}×${unit.length}`).join(", ");
  const quantityLabel = input.units.length === 1 ? areaCopy.singular : areaCopy.plural;
  return `${input.zipCode} · ${input.units.length} ${quantityLabel} · ${sizes} ft`;
}

const LOADING_SPRITES = ["basil", "tomato", "sunflower"];

function GardenLoadingPage({
  input,
  progress,
}: {
  input: PlannerInput | undefined;
  progress: PlanProgressEvent | null;
}) {
  const stageIndex = Math.max(0, LOADING_STAGES.indexOf(progress?.type ?? ""));
  const stages = [
    "Checking your local climate",
    progress?.type === "generating" ? providerLabel(progress.provider) : "Choosing plants",
    "Preparing your guide",
  ];
  const editHref = input
    ? `/planner?edit=1&type=${encodeURIComponent(input.gardenType)}#planner`
    : "/planner?edit=1#planner";
  return (
    <div className="planner-page planner-loading-page">
      <nav>
        <div className="container nav-inner">
          <Link className="logo" href="/" aria-label="FloraScape home">FloraScape</Link>
          {input ? (
            <a href={editHref} className="planner-back-link">Edit Inputs</a>
          ) : null}
        </div>
      </nav>
      <main className="planner-loading-main result-state-main">
        <div className="planner-loading-card result-state-card">
          <p className="result-state-kicker px" aria-hidden="true">Page 1 · being assembled</p>
          <h1 className="result-state-title">Collecting your garden…</h1>
          <p className="result-state-lead">
            We are matching plants to your dimensions, sunlight, location, and preferences.
          </p>
          {input ? <div className="loading-input-summary result-state-slip">{inputSummary(input)}</div> : null}
          <ol className="loading-steps result-state-sleeves" aria-label="Plan generation in progress">
            {stages.map((label, index) => {
              const state = index < stageIndex ? "done" : index === stageIndex ? "active" : "";
              return (
                <li key={index} className={state} aria-current={index === stageIndex ? "step" : undefined}>
                  <span className="result-state-sleeve-art" aria-hidden="true">
                    {state === "active" ? (
                      <PixelSprite plantName={LOADING_SPRITES[index] ?? "tomato"} scale={3} motion="grow" />
                    ) : state === "done" ? (
                      <PixelSprite plantName={LOADING_SPRITES[index] ?? "tomato"} scale={3} motion="still" />
                    ) : (
                      <span className="result-state-sleeve-empty px">?</span>
                    )}
                  </span>
                  <span className="result-state-sleeve-num px" aria-hidden="true">No. {index + 1}</span>
                  <span className="result-state-sleeve-label">{label}</span>
                </li>
              );
            })}
          </ol>
        </div>
      </main>
    </div>
  );
}

function TipsSection({ tips }: { tips: PlanTips | undefined }) {
  if (!tips) {
    return null;
  }

  const allGroups: { key: TipGroupKey; title: string }[] = [
    { key: "preferenceHelp", title: "Based on your preferences" },
    { key: "companionPlanting", title: "Good neighbors" },
    { key: "avoid", title: "What to avoid" },
    { key: "watering", title: "Watering wisely" },
    { key: "commonMistakes", title: "Common beginner mistakes" },
  ];
  const groups = allGroups.filter((group) => (tips[group.key] || []).length > 0);
  const columns = [
    groups.filter((_, index) => index % 2 === 0),
    groups.filter((_, index) => index % 2 === 1),
  ].filter((column) => column.length > 0);

  return (
    <section className="result-content-section tips-section print-section">
      <div className="result-section-heading">
        <span>03</span>
        <div>
          <h2>Tips for this garden</h2>
          <p>Small decisions that will help the plan succeed.</p>
        </div>
      </div>

      <div className="tips-flex screen-tips-grid">
        {columns.map((column, columnIndex) => (
          <div className="tips-column" key={`tips-column-${columnIndex}`}>
            {column.map((group) => (
              <article className="tip-group" key={group.key}>
                <h3>{group.title}</h3>
                <div className="tip-list">
                  {(tips[group.key] || []).map((tip: TipItem, index: number) => (
                    <div className="tip-item" key={`${group.key}-${index}`}>
                      <strong>{tip.title}</strong>
                      <p>{tip.detail}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ))}
      </div>

      <div className="print-only print-tips-list">
        {groups.map((group) => (
          <div key={`print-${group.key}`}>
            <strong>{group.title}</strong>
            {(tips[group.key] || []).map((tip: TipItem, index: number) => (
              <p key={`${group.key}-print-${index}`}>
                <b>{tip.title}:</b> {tip.detail}
              </p>
            ))}
          </div>
        ))}
        {tips.containerSetup ? (
          <div>
            <strong>Container setup: {tips.containerSetup.popularContainer}</strong>
            <p>{tips.containerSetup.popularityReason}</p>
            <p><b>Compost:</b> {tips.containerSetup.compostAdvice}</p>
            <p><b>Drainage:</b> {tips.containerSetup.drainageAdvice}</p>
          </div>
        ) : null}
      </div>

      {tips.containerSetup ? (
        <article className="container-setup-card screen-only">
          <div>
            <span className="section-kicker">Container setup for your area</span>
            <h3>{tips.containerSetup.popularContainer}</h3>
            <p>{tips.containerSetup.popularityReason}</p>
          </div>
          <div className="container-setup-grid">
            <div>
              <h4>Set it up</h4>
              <ol>
                {tips.containerSetup.setupSteps.map((step: string, index: number) => (
                  <li key={`setup-${index}`}>{step}</li>
                ))}
              </ol>
            </div>
            <div>
              <h4>Compost</h4>
              <p>{tips.containerSetup.compostAdvice}</p>
              <h4>Drainage</h4>
              <p>{tips.containerSetup.drainageAdvice}</p>
            </div>
          </div>
        </article>
      ) : null}
    </section>
  );
}

const STARTER_PLAN_SOURCES = new Set(["fallback-example", "starter-plan"]);

/** "Starter plan", "Saved result", or "AI plan · Gemini"; empty before a plan exists. */
function planSourceLabel(result: StoredPlannerResult | null): { kind: "starter" | "cached" | "ai" | ""; label: string } {
  if (!result?.plan || !result.modelUsed) {
    return { kind: "", label: "" };
  }
  if (STARTER_PLAN_SOURCES.has(result.modelUsed)) {
    return { kind: "starter", label: "Starter plan" };
  }
  if (result.cached) {
    return { kind: "cached", label: "Saved result" };
  }
  // Provider names look like "gemini:gemini-3.6-flash"; show the readable provider part.
  const provider = String(result.modelUsed).split(":")[0];
  return { kind: "ai", label: `AI plan · ${provider.charAt(0).toUpperCase()}${provider.slice(1)}` };
}

/** Keeps the plan in this tab and saves it to the device's albums. */
function persistResult(result: StoredPlannerResult) {
  writeSessionJson(PLANNER_RESULT_KEY, result);
  saveAlbum(result);
}

// Matches the ids the planting guide gives its cards (see normalizeGuide / guideEntryFromFacts).
function guideIdFor(plantName: string) {
  return `guide-${slugify(plantName)}`;
}

export default function PlannerResultPage() {
  const [result, setResult] = useState<StoredPlannerResult | null>(null);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState<PlanProgressEvent | null>(null);
  const [apiError, setApiError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setResult(readStoredResult());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!result?.plannerInput || result.plan || status !== "idle") {
      return;
    }
    const currentResult = result;
    const plannerInput = result.plannerInput;

    async function generatePlan() {
      setStatus("loading");
      setApiError("");

      try {
        const response = await fetch("/api/generate-garden-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
          body: JSON.stringify({ plannerInput }),
        });
        // Validation errors still come back as plain JSON; success streams progress events.
        const data: GenerateResponse = response.headers.get("content-type")?.includes("application/x-ndjson")
          ? await readPlanStream(response, (event: PlanProgressEvent) => setProgress(event))
          : await response.json();

        if (!response.ok || !data.plan) {
          throw new Error(data.error || "Failed to generate a garden plan.");
        }

        const nextResult: StoredPlannerResult = {
          ...currentResult,
          plan: data.plan,
          modelUsed: data.modelUsed || "unknown",
          apiWarning: data.warning || "",
          climate: data.climate || null,
          cached: Boolean(data.cached),
          chat: [],
          aiGeneratedAt: new Date().toISOString(),
        };
        persistResult(nextResult);
        setResult(nextResult);
        setStatus("success");
      } catch (error) {
        setApiError(error instanceof Error ? error.message : "Failed to generate a garden plan.");
        setStatus("error");
      }
    }

    generatePlan();
  }, [result, status]);

  function loadStarterPlan() {
    const plan = result?.plannerInput
      ? createFallbackGardenPlan(result.plannerInput, { climate: result.climate || null })
      : createExampleGardenPlan();
    const nextResult: StoredPlannerResult = {
      ...result,
      generatedAt: result?.generatedAt || new Date().toISOString(),
      selectedPlants: result?.selectedPlants || ["Vegetables", "Herbs", "Flowers"],
      plan,
      modelUsed: "starter-plan",
      apiWarning: "",
      cached: false,
      chat: [],
      aiGeneratedAt: new Date().toISOString(),
    };
    persistResult(nextResult);
    setResult(nextResult);
    setStatus("success");
  }

  function handleSketchLayoutChange(nextLayout: Layout) {
    setResult((previous) => {
      if (!previous?.plan) {
        return previous;
      }
      const quantityByPlant = new Map<string, number>();
      nextLayout.plants.forEach((plant) => {
        const key = plant.name.toLowerCase();
        quantityByPlant.set(
          key,
          (quantityByPlant.get(key) || 0) + (Number(plant.quantity) || 1),
        );
      });
      const nextResult: StoredPlannerResult = {
        ...previous,
        plan: {
          ...previous.plan,
          layout: nextLayout,
          plantingGuide: previous.plan.plantingGuide.map((item) => ({
            ...item,
            quantity: quantityByPlant.get(item.plantName.toLowerCase()) || 0,
          })),
        },
      };
      persistResult(nextResult);
      return nextResult;
    });
  }

  function updatePlan(transform: PlanTransform) {
    setResult((previous) => {
      if (!previous?.plan) {
        return previous;
      }
      const nextResult = {
        ...previous,
        plan: transform(previous.plan, { climate: previous.climate || null }),
      };
      persistResult(nextResult);
      return nextResult;
    });
  }

  function handleSwapPlant(plantId: string, plantName: string) {
    updatePlan((current, options) => swapPlant(current, plantId, plantName, options));
  }

  function handleSwapZones(firstId: string, secondId: string) {
    updatePlan((current, options) => swapZones(current, firstId, secondId, options));
  }

  function handleShuffle() {
    updatePlan((current, options) => shufflePlan(current, options));
  }

  function handleChatMessagesChange(nextMessages: ChatMessage[]) {
    setResult((previous) => {
      if (!previous) {
        return previous;
      }
      const nextResult = { ...previous, chat: nextMessages };
      persistResult(nextResult);
      return nextResult;
    });
  }

  // Guides live on the plant cards as folded details: open the card's guide, then scroll to it.
  function scrollToGuide(guideId: string) {
    const target = document.getElementById(guideId);
    if (target instanceof HTMLDetailsElement) {
      target.open = true;
    }
    const card = target?.closest(".album-card") ?? target;
    card?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Flash the card so it stands out in the grid; restarting the class replays the flash.
    card?.classList.remove("is-spotlit");
    void (card as HTMLElement | null)?.offsetWidth;
    card?.classList.add("is-spotlit");
    window.setTimeout(() => card?.classList.remove("is-spotlit"), 2400);
  }

  const plan = result?.plan;
  const planId = result?.aiGeneratedAt || result?.generatedAt;

  // A new plan is a new album page: +XP once per plan.
  useEffect(() => {
    if (!plan || !planId) {
      return;
    }
    const kinds = new Set(plan.layout.plants.map((item) => item.name.toLowerCase())).size;
    recordProgress({ kind: "plan-created", key: `plan:${planId}`, detail: { plantKinds: kinds } });
  }, [plan, planId]);

  // Every plan is saved to this device's albums (also covers plans opened from an older session).
  useEffect(() => {
    if (result?.plan) {
      saveAlbum(result);
    }
  }, [result]);
  const editHref = result?.plannerInput
    ? `/planner?edit=1&type=${encodeURIComponent(result.plannerInput.gardenType)}#planner`
    : "/planner?edit=1#planner";
  const isGenerating =
    !hydrated ||
    Boolean(
      result?.plannerInput &&
      !result.plan &&
      (status === "idle" || status === "loading"),
    );

  if (isGenerating) {
    return <GardenLoadingPage input={result?.plannerInput} progress={progress} />;
  }

  return (
    <div className="planner-page planner-result-page">
      <nav>
        <div className="container nav-inner">
          <Link className="logo" href="/" aria-label="FloraScape home">FloraScape</Link>
          <div className="planner-nav-actions">
            <NavAlbumsLink />
            <LevelBadge />
            {/* With a plan, "Edit inputs" lives in the album toolbar instead. */}
            {plan ? null : <a href={editHref} className="planner-back-link">Edit Inputs</a>}
            <a href="/planner" className="btn">
              <Leaf size={17} strokeWidth={2.3} aria-hidden="true" />
              Start Over
            </a>
          </div>
        </div>
      </nav>

      <main className={plan ? "look-root look-album" : undefined}>
        {plan && result ? (
          <div className="container look-dashboard-container">
            <AlbumDashboard
              plan={plan}
              climate={result.climate || null}
              plannerInput={result.plannerInput}
              sourceLabel={planSourceLabel(result).label}
              warning={result.apiWarning || ""}
              inputSummary={inputSummary(result.plannerInput)}
              editHref={editHref}
              canShuffle={Object.values(plan.alternatives || {}).some((list) => list.length > 0)}
              onShuffle={handleShuffle}
              onCalendar={() => downloadPlantingCalendar(plan, result.climate || null)}
              onPrint={() => window.print()}
              onSwapPlant={handleSwapPlant}
              onSwapZones={handleSwapZones}
              onLayoutChange={handleSketchLayoutChange}
              onOpenGuide={(plantItem) => scrollToGuide(guideIdFor(plantItem.name))}
            />
            {result.plannerInput?.gardenType === "any" && plan.recommendedGardenType ? (
              <p className="garden-method-recommendation">
                <strong>Recommended setup:</strong> {getGardenMethodLabel(plan.recommendedGardenType)}
              </p>
            ) : null}
          </div>
        ) : (
          <section className="hero planner-result-hero">
            <div className="container hero-content">
              <h1>Garden Blueprint</h1>
              <p>{inputSummary(result?.plannerInput)}</p>
            </div>
          </section>
        )}

        <section className="section result-shell-section">
          <div className="container result-container">
            {result ? (
              <>
                {!plan ? (
                  <>
                    <div className="result-actions result-state-card result-state-compact no-print">
                      <div className="generation-state">
                        <Sparkles size={18} aria-hidden="true" />
                        {status === "loading" ? <span>Designing your garden…</span> : null}
                        {status === "error" ? <span className="ai-error">{apiError}</span> : null}
                      </div>
                      <div className="result-action-buttons">
                        {status !== "loading" ? (
                          <button type="button" className="btn secondary-action" onClick={loadStarterPlan}>
                            Use Starter Plan
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {result.apiWarning ? <p className="result-warning">{result.apiWarning}</p> : null}
                  </>
                ) : null}

                {plan ? (
                  <>
                    <NotesTabs
                      title="Garden notes"
                      tabs={[
                        { id: "shopping", label: "Shopping list", content: <ShoppingList layout={plan.layout} /> },
                        { id: "neighbors", label: "Neighbors", content: <NeighborCheck layout={plan.layout} /> },
                        { id: "tips", label: "Tips", content: <TipsSection tips={plan.tips} /> },
                        {
                          id: "rotation",
                          label: "Crop rotation",
                          content: (
                            <CropRotation
                              plan={plan}
                              planId={result.aiGeneratedAt || result.generatedAt}
                              zipCode={result.plannerInput?.zipCode}
                              onApplySwap={handleSwapPlant}
                            />
                          ),
                        },
                      ]}
                    />
                    {/* The garden helper needs an AI provider, which isn't hooked up yet: shown faded and inert. */}
                    <div className="coming-soon no-print" inert aria-label="Ask about my garden, coming soon">
                      <span className="coming-soon-badge px">Coming soon</span>
                      <GardenChat
                        plan={plan}
                        climate={result.climate || null}
                        // No past replies (e.g. "AI unavailable" notices) while the helper is coming soon.
                        messages={[]}
                        onMessagesChange={handleChatMessagesChange}
                        onApplySwap={handleSwapPlant}
                      />
                    </div>
                    <AlbumShelf currentId={planId} heading="Your other albums" />
                  </>
                ) : null}
              </>
            ) : (
              <div className="empty-state result-state-card result-state-compact">
                <p>No planner inputs were found.</p>
                <a href="/planner" className="btn">Open Planner</a>
                <button type="button" className="btn secondary-action" onClick={loadStarterPlan}>
                  View Example
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <footer>© 2026 FloraScape - Grow beautifully.</footer>
    </div>
  );
}

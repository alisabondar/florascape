"use client";

import { CalendarPlus, Leaf, Printer, Shuffle, Sparkles, Sprout } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import CropRotation from "../../components/CropRotation";
import GardenChat from "../../components/GardenChat";
import GardenSketch from "../../components/GardenSketch";
import { isResultLook, LOOK_DASHBOARDS, RESULT_LOOKS } from "../../components/looks";
import type { ResultLookId } from "../../components/looks";
import {
  downloadPlantingCalendar,
  NeighborCheck,
  ShoppingList,
} from "../../components/PlanExtras";
import {
  createExampleGardenPlan,
  createFallbackGardenPlan,
  groupGuideByTiming,
  shufflePlan,
  slugify,
  swapPlant,
  swapZones,
} from "../../../lib/garden-plan";
import { getPlantSectionSizes } from "../../../lib/garden-layout";
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
  GuideEntry,
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

interface SectionSize {
  bedName: string;
  width: number;
  height: number;
}

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
      <main className="planner-loading-main">
        <div className="planner-loading-card">
          <div className="loading-sprout" aria-hidden="true">
            <span />
            <Sprout size={42} strokeWidth={1.8} />
          </div>
          <h1>Designing your garden…</h1>
          <p>
            We are matching plants to your dimensions, sunlight, location, and preferences.
          </p>
          {input ? <div className="loading-input-summary">{inputSummary(input)}</div> : null}
          <ol className="loading-steps" aria-label="Plan generation in progress">
            {stages.map((label, index) => (
              <li
                key={index}
                className={index < stageIndex ? "done" : index === stageIndex ? "active" : ""}
                aria-current={index === stageIndex ? "step" : undefined}
              >
                {label}
              </li>
            ))}
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

function sectionSizeText(sections: SectionSize[] = []) {
  return sections
    .map((section) => `${section.bedName}: about ${section.width} × ${section.height} ft`)
    .join("; ");
}

function PlantingGuide({ guide, layout }: { guide: GuideEntry[] | undefined; layout: Layout | undefined }) {
  const visibleGuide = guide?.filter((item: GuideEntry) => item.quantity > 0) || [];
  if (!visibleGuide.length) {
    return null;
  }
  const sectionSizes: Record<string, SectionSize[]> = layout ? getPlantSectionSizes(layout) : {};

  return (
    <section className="result-content-section planting-guide print-section">
      <div className="result-section-heading">
        <span>02</span>
        <div>
          <h2>General Planting Guide</h2>
          <p>Use this as a starting point for buying and planting.</p>
        </div>
      </div>

      <p className="seed-disclaimer">
        “Target” means the healthy mature plants the space can support. Sow a reasonable buffer
        for germination, then thin to the target. You usually do not need to empty the whole packet.
        Always follow the packet or plant tag because cultivars vary. Follow its planting depth and
        keep the seedbed evenly moist while plants establish.
      </p>

      {groupGuideByTiming(visibleGuide).map((group) => (
        <div className="guide-timing-group screen-guide-list" key={group.key}>
          <h3 className="guide-timing-heading">
            {group.title}
            <span>
              {group.plantCount} {group.plantCount === 1 ? "plant" : "plants"}
            </span>
          </h3>
          <div className="guide-list">
            {group.items.map((item: GuideEntry) => {
              const sizes = sectionSizes[item.plantName.toLowerCase()] || [];
              return (
                <article className="guide-card" id={item.id} key={item.id}>
                  <div className="guide-card-heading">
                    <div>
                      <h3>{item.plantName}</h3>
                      <span>{item.timingLabel || item.whenToPlant}</span>
                    </div>
                    <strong>Target: {item.quantity} mature {item.quantity === 1 ? "plant" : "plants"}</strong>
                  </div>
                  <p className="guide-timing">{item.timingDetails}</p>
                  <dl>
                    <div>
                      <dt>Spacing</dt>
                      <dd>{item.spacingInches} inches</dd>
                    </div>
                    <div>
                      <dt>How much to sow</dt>
                      <dd>
                        {item.sowingAmount || `Start a few extra seeds and thin to ${item.quantity} healthy plants.`}
                      </dd>
                    </div>
                    {sizes.length ? (
                      <div>
                        <dt>Allocated space</dt>
                        <dd>{sectionSizeText(sizes)}</dd>
                      </div>
                    ) : null}
                    {item.plantingDepth ? (
                      <div>
                        <dt>Specific depth</dt>
                        <dd>{item.plantingDepth}</dd>
                      </div>
                    ) : null}
                    {item.watering ? (
                      <div>
                        <dt>Specific watering</dt>
                        <dd>{item.watering}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {item.notes ? <p className="guide-note">{item.notes}</p> : null}
                </article>
              );
            })}
          </div>
        </div>
      ))}

      <table className="print-only print-guide-table">
        <thead>
          <tr>
            <th>Plant and timing</th>
            <th>Target and space</th>
            <th>Spacing</th>
            <th>How much to sow</th>
            <th>Plant-specific care</th>
          </tr>
        </thead>
        <tbody>
          {visibleGuide.map((item) => {
            const sizes = sectionSizes[item.plantName.toLowerCase()] || [];
            const care = [item.plantingDepth, item.watering, item.notes].filter(Boolean).join(" ");
            return (
              <tr key={`print-${item.id}`}>
                <td><strong>{item.plantName}</strong><br />{item.timingLabel}<br />{item.timingDetails}</td>
                <td>{item.quantity} mature<br />{sectionSizeText(sizes)}</td>
                <td>{item.spacingInches} in</td>
                <td>{item.sowingAmount}</td>
                <td>{care || "Follow the guide header."}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function formatMonthDay(monthDay: string | null) {
  if (!monthDay) {
    return "None recorded";
  }
  const [month, day] = monthDay.split("-").map(Number);
  return new Date(Date.UTC(2001, month - 1, day)).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function ClimateSummary({ climate }: { climate: ClimateContext | null | undefined }) {
  if (!climate?.hardinessZone) {
    return null;
  }

  const frostDays = climate.forecast?.frostWarning ? climate.forecast.frostDays : [];

  return (
    <section className="climate-summary print-section" aria-label="Local climate">
      {frostDays.length ? (
        <p className="result-warning frost-warning" role="alert">
          <strong>Frost warning:</strong> frost is forecast on{" "}
          {frostDays.map((date: string) => formatMonthDay(date.slice(5))).join(", ")}. Protect or delay
          frost-tender plants.
        </p>
      ) : null}
      <dl className="climate-facts">
        <div>
          <dt>Hardiness zone</dt>
          <dd>{climate.hardinessZone}</dd>
        </div>
        {climate.frost ? (
          <>
            <div>
              <dt>Last spring frost</dt>
              <dd>{formatMonthDay(climate.frost.lastSpringFrost)}</dd>
            </div>
            <div>
              <dt>First fall frost</dt>
              <dd>{formatMonthDay(climate.frost.firstFallFrost)}</dd>
            </div>
            <div>
              <dt>Growing season</dt>
              <dd>{climate.frost.growingSeasonDays} days</dd>
            </div>
          </>
        ) : null}
      </dl>
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

function PlanSourceBadge({ result }: { result: StoredPlannerResult | null }) {
  const { kind, label } = planSourceLabel(result);
  if (!kind) {
    return null;
  }
  return (
    <span className={`plan-source-badge ${kind}`} title={kind === "ai" ? result?.modelUsed : undefined}>
      {label}
    </span>
  );
}

const LOOK_STORAGE_KEY = "florascape_result_look";

// Matches the ids the planting guide gives its cards (see normalizeGuide / guideEntryFromFacts).
function guideIdFor(plantName: string) {
  return `guide-${slugify(plantName)}`;
}

/** Picks how the results page looks; the choice is kept in the URL (?look=) and on this device. */
function LookSwitcher({ look, onChange }: { look: ResultLookId; onChange: (look: ResultLookId) => void }) {
  return (
    <div className="look-switcher no-print" role="group" aria-label="Results page look">
      <span>Look:</span>
      {RESULT_LOOKS.map((option) => (
        <button
          type="button"
          key={option.id}
          aria-pressed={look === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function PlannerResultPage() {
  const [result, setResult] = useState<StoredPlannerResult | null>(null);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState<PlanProgressEvent | null>(null);
  const [apiError, setApiError] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [look, setLook] = useState<ResultLookId>("classic");

  useEffect(() => {
    setResult(readStoredResult());
    const requested = new URLSearchParams(window.location.search).get("look");
    const saved = window.localStorage.getItem(LOOK_STORAGE_KEY);
    if (isResultLook(requested)) {
      setLook(requested);
    } else if (isResultLook(saved)) {
      setLook(saved);
    }
    setHydrated(true);
  }, []);

  function changeLook(next: ResultLookId) {
    setLook(next);
    window.localStorage.setItem(LOOK_STORAGE_KEY, next);
    const url = new URL(window.location.href);
    url.searchParams.set("look", next);
    window.history.replaceState(null, "", url);
  }

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
        writeSessionJson(PLANNER_RESULT_KEY, nextResult);
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
    writeSessionJson(PLANNER_RESULT_KEY, nextResult);
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
      writeSessionJson(PLANNER_RESULT_KEY, nextResult);
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
      writeSessionJson(PLANNER_RESULT_KEY, nextResult);
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
      writeSessionJson(PLANNER_RESULT_KEY, nextResult);
      return nextResult;
    });
  }

  function scrollToGuide(guideId: string) {
    document.getElementById(guideId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const plan = result?.plan;
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
            <a href={editHref} className="planner-back-link">Edit Inputs</a>
            <a href="/planner" className="btn">
              <Leaf size={17} strokeWidth={2.3} aria-hidden="true" />
              Start Over
            </a>
          </div>
        </div>
      </nav>

      <main className={look === "classic" ? undefined : `look-root look-${look}`}>
        {plan && result ? <LookSwitcher look={look} onChange={changeLook} /> : null}
        {plan && result && look !== "classic" ? (
          (() => {
            const Dashboard = LOOK_DASHBOARDS[look];
            return (
              <div className="container look-dashboard-container">
                <Dashboard
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
                  onOpenGuide={(plantItem) => scrollToGuide(guideIdFor(plantItem.name))}
                />
              </div>
            );
          })()
        ) : null}
        {look === "classic" || !plan ? (
        <section className="hero planner-result-hero">
          <div className="container hero-content">
            <h1>Garden Blueprint</h1>
            <p>{inputSummary(result?.plannerInput)}</p>
          </div>
        </section>
        ) : null}

        <section className="section result-shell-section">
          <div className="container result-container">
            {result ? (
              <>
                {look === "classic" || !plan ? (
                <>
                <div className="result-actions no-print">
                  <div className="generation-state">
                    <Sparkles size={18} aria-hidden="true" />
                    {status === "loading" ? <span>Designing your garden…</span> : null}
                    {status === "error" ? <span className="ai-error">{apiError}</span> : null}
                    {status === "success" ? <span>Your plan is ready.</span> : null}
                    {plan && status !== "loading" ? <PlanSourceBadge result={result} /> : null}
                  </div>
                  <div className="result-action-buttons">
                    {status === "error" || (!plan && status !== "loading") ? (
                      <button type="button" className="btn secondary-action" onClick={loadStarterPlan}>
                        Use Starter Plan
                      </button>
                    ) : null}
                    {plan && Object.values(plan.alternatives || {}).some((list) => list.length) ? (
                      <button type="button" className="btn secondary-action" onClick={handleShuffle}>
                        <Shuffle size={17} aria-hidden="true" />
                        Shuffle Plants
                      </button>
                    ) : null}
                    {plan ? (
                      <button
                        type="button"
                        className="btn secondary-action"
                        onClick={() => downloadPlantingCalendar(plan, result.climate || null)}
                      >
                        <CalendarPlus size={17} aria-hidden="true" />
                        Add to calendar
                      </button>
                    ) : null}
                    {plan ? (
                      <button type="button" className="btn" onClick={() => window.print()}>
                        <Printer size={17} aria-hidden="true" />
                        Print Plan
                      </button>
                    ) : null}
                  </div>
                </div>

                {result.apiWarning ? <p className="result-warning">{result.apiWarning}</p> : null}
                <ClimateSummary climate={result.climate} />
                </>
                ) : null}

                {plan ? (
                  <>
                    <section className="result-content-section sketch-section print-section">
                      <div className="result-section-heading">
                        <span>01</span>
                        <div>
                          <h2>Your garden sketch</h2>
                          <p>{plan.summary}</p>
                        </div>
                      </div>
                      {result?.plannerInput?.gardenType === "any" && plan.recommendedGardenType ? (
                        <p className="garden-method-recommendation">
                          <strong>Recommended setup:</strong>{" "}
                          {getGardenMethodLabel(plan.recommendedGardenType)}
                        </p>
                      ) : null}
                      <GardenSketch
                        layout={plan.layout}
                        onLayoutChange={handleSketchLayoutChange}
                        onPlantSectionClick={scrollToGuide}
                        alternatives={plan.alternatives}
                        onSwapPlant={handleSwapPlant}
                        onSwapZones={handleSwapZones}
                      />
                    </section>
                    <PlantingGuide guide={plan.plantingGuide} layout={plan.layout} />
                    <TipsSection tips={plan.tips} />
                    <NeighborCheck layout={plan.layout} />
                    <ShoppingList layout={plan.layout} />
                    <CropRotation
                      plan={plan}
                      planId={result.aiGeneratedAt || result.generatedAt}
                      zipCode={result.plannerInput?.zipCode}
                      onApplySwap={handleSwapPlant}
                    />
                    <GardenChat
                      plan={plan}
                      climate={result.climate || null}
                      messages={result.chat || []}
                      onMessagesChange={handleChatMessagesChange}
                      onApplySwap={handleSwapPlant}
                    />
                  </>
                ) : null}
              </>
            ) : (
              <div className="empty-state">
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

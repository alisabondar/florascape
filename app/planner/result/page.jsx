"use client";

import { CalendarPlus, Leaf, Printer, Shuffle, Sparkles, Sprout } from "lucide-react";
import { useEffect, useState } from "react";
import GardenSketch from "../../components/GardenSketch";
import {
  downloadPlantingCalendar,
  NeighborCheck,
  ShoppingList,
} from "../../components/PlanExtras";
import {
  createExampleGardenPlan,
  createFallbackGardenPlan,
  groupGuideByTiming,
  layoutTableRows,
  shufflePlan,
  swapPlant,
} from "../../../lib/garden-plan";
import { getPlantSectionSizes } from "../../../lib/garden-layout";
import {
  getAreaCopy,
  getGardenMethodLabel,
} from "../../../lib/planner-config";
import {
  PLANNER_RESULT_KEY,
  readSessionJson,
  writeSessionJson,
} from "../../../lib/session-storage";

function inputSummary(input) {
  if (!input) {
    return "Example garden";
  }
  if (input.gardenType === "in_ground") {
    const sections = input.inGround.sectionCount === 1
      ? "one plot"
      : `${input.inGround.sectionCount} sections`;
    return `${input.zipCode} · In-ground · ${input.inGround.width} × ${input.inGround.length} ft · ${sections}`;
  }
  const areaCopy = getAreaCopy(input.gardenType);
  const sizes = input.units.map((unit) => `${unit.width}×${unit.length}`).join(", ");
  const quantityLabel = input.units.length === 1 ? areaCopy.singular : areaCopy.plural;
  return `${input.zipCode} · ${input.units.length} ${quantityLabel} · ${sizes} ft`;
}

function GardenLoadingPage({ input }) {
  const editHref = input
    ? `/planner?edit=1&type=${encodeURIComponent(input.gardenType)}#planner`
    : "/planner?edit=1#planner";
  return (
    <div className="planner-page planner-loading-page">
      <nav>
        <div className="container nav-inner">
          <a className="logo" href="/" aria-label="FloraScape home">FloraScape</a>
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
          <div className="loading-steps" aria-label="Plan generation in progress">
            <span>Choosing plants</span>
            <i />
            <span>Arranging growing zones</span>
            <i />
            <span>Preparing your guide</span>
          </div>
        </div>
      </main>
    </div>
  );
}

function TipsSection({ tips }) {
  if (!tips) {
    return null;
  }

  const groups = [
    { key: "preferenceHelp", title: "Based on your preferences" },
    { key: "companionPlanting", title: "Good neighbors" },
    { key: "avoid", title: "What to avoid" },
    { key: "watering", title: "Watering wisely" },
    { key: "commonMistakes", title: "Common beginner mistakes" },
  ].filter((group) => (tips[group.key] || []).length > 0);
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
                  {(tips[group.key] || []).map((tip, index) => (
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
            {(tips[group.key] || []).map((tip, index) => (
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
                {tips.containerSetup.setupSteps.map((step, index) => (
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

function sectionSizeText(sections = []) {
  return sections
    .map((section) => `${section.bedName}: about ${section.width} × ${section.height} ft`)
    .join("; ");
}

function PlantingGuide({ guide, layout }) {
  const visibleGuide = guide?.filter((item) => item.quantity > 0) || [];
  if (!visibleGuide.length) {
    return null;
  }
  const sectionSizes = layout ? getPlantSectionSizes(layout) : {};

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
            {group.items.map((item) => {
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

function formatMonthDay(monthDay) {
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

function ClimateSummary({ climate }) {
  if (!climate?.hardinessZone) {
    return null;
  }

  const frostDays = climate.forecast?.frostWarning ? climate.forecast.frostDays : [];

  return (
    <section className="climate-summary print-section" aria-label="Local climate">
      {frostDays.length ? (
        <p className="result-warning frost-warning" role="alert">
          <strong>Frost warning:</strong> frost is forecast on{" "}
          {frostDays.map((date) => formatMonthDay(date.slice(5))).join(", ")}. Protect or delay
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

function PlanSourceBadge({ result }) {
  if (!result?.plan || !result.modelUsed) {
    return null;
  }
  if (STARTER_PLAN_SOURCES.has(result.modelUsed)) {
    return <span className="plan-source-badge starter">Starter plan</span>;
  }
  if (result.cached) {
    return <span className="plan-source-badge cached">Saved result</span>;
  }
  // Provider names look like "gemini:gemini-3.6-flash"; show the readable provider part.
  const provider = String(result.modelUsed).split(":")[0];
  const label = provider.charAt(0).toUpperCase() + provider.slice(1);
  return (
    <span className="plan-source-badge ai" title={result.modelUsed}>
      AI plan · {label}
    </span>
  );
}

export default function PlannerResultPage() {
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [apiError, setApiError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setResult(readSessionJson(PLANNER_RESULT_KEY));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!result?.plannerInput || result.plan || status !== "idle") {
      return;
    }

    async function generatePlan() {
      setStatus("loading");
      setApiError("");

      try {
        const response = await fetch("/api/generate-garden-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plannerInput: result.plannerInput }),
        });
        const data = await response.json();

        if (!response.ok || !data.plan) {
          throw new Error(data.error || "Failed to generate a garden plan.");
        }

        const nextResult = {
          ...result,
          plan: data.plan,
          modelUsed: data.modelUsed || "unknown",
          apiWarning: data.warning || "",
          climate: data.climate || null,
          cached: Boolean(data.cached),
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
    const nextResult = {
      ...result,
      generatedAt: result?.generatedAt || new Date().toISOString(),
      selectedPlants: result?.selectedPlants || ["Vegetables", "Herbs", "Flowers"],
      plan,
      modelUsed: "starter-plan",
      apiWarning: "",
      cached: false,
      aiGeneratedAt: new Date().toISOString(),
    };
    writeSessionJson(PLANNER_RESULT_KEY, nextResult);
    setResult(nextResult);
    setStatus("success");
  }

  function handleSketchLayoutChange(nextLayout) {
    setResult((previous) => {
      if (!previous?.plan) {
        return previous;
      }
      const quantityByPlant = new Map();
      nextLayout.plants.forEach((plant) => {
        const key = plant.name.toLowerCase();
        quantityByPlant.set(
          key,
          (quantityByPlant.get(key) || 0) + (Number(plant.quantity) || 1),
        );
      });
      const nextResult = {
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

  function updatePlan(transform) {
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

  function handleSwapPlant(plantId, plantName) {
    updatePlan((current, options) => swapPlant(current, plantId, plantName, options));
  }

  function handleShuffle() {
    updatePlan((current, options) => shufflePlan(current, options));
  }

  function scrollToGuide(guideId) {
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
    return <GardenLoadingPage input={result?.plannerInput} />;
  }

  return (
    <div className="planner-page planner-result-page">
      <nav>
        <div className="container nav-inner">
          <a className="logo" href="/" aria-label="FloraScape home">FloraScape</a>
          <div className="planner-nav-actions">
            <a href={editHref} className="planner-back-link">Edit Inputs</a>
            <a href="/planner" className="btn">
              <Leaf size={17} strokeWidth={2.3} aria-hidden="true" />
              Start Over
            </a>
          </div>
        </div>
      </nav>

      <main>
        <section className="hero planner-result-hero">
          <div className="container hero-content">
            <h1>Garden Blueprint</h1>
            <p>{inputSummary(result?.plannerInput)}</p>
          </div>
        </section>

        <section className="section result-shell-section">
          <div className="container result-container">
            {result ? (
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
                      />
                    </section>
                    <PlantingGuide guide={plan.plantingGuide} layout={plan.layout} />
                    <TipsSection tips={plan.tips} />
                    <NeighborCheck layout={plan.layout} />
                    <ShoppingList layout={plan.layout} />
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

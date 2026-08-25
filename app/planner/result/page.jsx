"use client";

import { Leaf, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import GardenSketch from "../../components/GardenSketch";
import { createExampleGardenLayout } from "../../../lib/garden-layout";

const STORAGE_KEY = "florascape_planner_result";

export default function PlannerResultPage() {
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    const rawResult = window.sessionStorage.getItem(STORAGE_KEY);
    if (!rawResult) {
      return;
    }

    try {
      setResult(JSON.parse(rawResult));
    } catch {
      setResult(null);
    }
  }, []);

  useEffect(() => {
    if (!result || result.layout || status !== "idle") {
      return;
    }

    async function generateLayout() {
      setStatus("loading");
      setApiError("");

      try {
        const response = await fetch("/api/generate-garden-plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: result.prompt }),
        });

        const data = await response.json();

        if (!response.ok || !data.layout) {
          throw new Error(data.error || "Failed to generate layout.");
        }

        const nextResult = {
          ...result,
          layout: data.layout,
          modelUsed: data.modelUsed || "unknown",
          apiWarning: data.warning || "",
          aiGeneratedAt: new Date().toISOString(),
        };

        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextResult));
        setResult(nextResult);
        setStatus("success");
      } catch (error) {
        setApiError(error.message);
        setStatus("error");
      }
    }

    generateLayout();
  }, [result, status]);

  function loadExample() {
    const nextResult = {
      generatedAt: new Date().toISOString(),
      prompt: result?.prompt || "Example layout",
      selectedPlants: result?.selectedPlants || [
        "Herbs",
        "Flowers",
        "Vegetables",
      ],
      formValues: result?.formValues || {
        zipCode: "07030",
        gardenType: "Raised beds",
        sunExposure: "Partial Shade",
        width: 12,
        height: 10,
      },
      ...result,
      layout: createExampleGardenLayout(),
      modelUsed: "example-layout",
      apiWarning: "",
      aiGeneratedAt: new Date().toISOString(),
    };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextResult));
    setResult(nextResult);
    setStatus("success");
  }

  function handleSketchLayoutChange(nextLayout) {
    setResult((prev) => {
      if (!prev) {
        return prev;
      }
      const nextResult = {
        ...prev,
        layout: nextLayout,
      };
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextResult));
      return nextResult;
    });
  }

  function printSketch() {
    window.print();
  }

  return (
    <div className="planner-page planner-result-page">
      <nav>
        <div className="container nav-inner">
          <a className="logo" href="/" aria-label="FloraScape home">
            FloraScape
          </a>
          <div className="planner-nav-actions">
            <a href="/planner" className="planner-back-link">
              Edit Inputs
            </a>
            <a href="/planner" className="btn">
              <Leaf size={17} strokeWidth={2.3} />
              Start Over
            </a>
          </div>
        </div>
      </nav>

      <main>
        <section className="hero planner-result-hero">
          <div className="container hero-content">
            <div className="eyebrow">Result</div>
            <h1>Interactive Garden Sketch</h1>
          </div>
        </section>

        <section className="section">
          <div className="container planner-grid">
            <div className="panel">
              {result ? (
                <>
                  <div className="result-chip">
                    <strong>Plants:</strong>{" "}
                    {result.selectedPlants?.join(", ") || "None"}
                  </div>

                  <div className="result-chip">
                    <strong>Inputs:</strong> {result.formValues.zipCode} |{" "}
                    {result.formValues.gardenType} |{" "}
                    {result.formValues.sunExposure} | {result.formValues.width}x
                    {result.formValues.height} ft
                  </div>

                  <div className="ai-plan">
                    <h3>
                      <Sparkles size={18} strokeWidth={2.3} />
                      LLM {"->"} JSON {"->"} SVG {"->"} Rough.js
                    </h3>
                    {status === "loading" ? (
                      <p className="ai-state">Generating structured layout...</p>
                    ) : null}
                    {status === "error" ? (
                      <p className="ai-error">{apiError}</p>
                    ) : null}
                    <button type="button" className="btn example-btn" onClick={loadExample}>
                      Load Example Layout
                    </button>
                    <button type="button" className="btn example-btn" onClick={printSketch}>
                      Print Sketch
                    </button>
                    {result.modelUsed ? (
                      <p className="ai-state">Model: {result.modelUsed}</p>
                    ) : null}
                    {result.apiWarning ? (
                      <p className="ai-state">{result.apiWarning}</p>
                    ) : null}
                  </div>

                  {result.layout ? (
                    <>
                      <GardenSketch
                        layout={result.layout}
                        onLayoutChange={handleSketchLayoutChange}
                      />
                      <details className="layout-json">
                        <summary>Layout JSON</summary>
                        <pre>{JSON.stringify(result.layout, null, 2)}</pre>
                      </details>
                    </>
                  ) : null}
                </>
              ) : (
                <div className="empty-state">
                  <p>No result found.</p>
                  <button type="button" className="btn example-btn" onClick={loadExample}>
                    Load Example Layout
                  </button>
                  <button type="button" className="btn example-btn" onClick={printSketch}>
                    Print Sketch
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer>© 2026 FloraScape - Grow beautifully.</footer>
    </div>
  );
}

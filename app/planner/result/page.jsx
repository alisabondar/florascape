"use client";

import { Leaf, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "florascape_planner_result";

export default function PlannerResultPage() {
  const [result, setResult] = useState(null);

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
              New Result
            </a>
          </div>
        </div>
      </nav>

      <main>
        <section className="hero planner-result-hero">
          <div className="container hero-content">
            <div className="eyebrow">Result</div>
            <h1>Generated Garden Result</h1>
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

                  <pre>{result.prompt}</pre>

                  <div className="layout-placeholder">
                    <h3>Layout Preview</h3>
                    <p>
                      {result.formValues.width} x {result.formValues.height} ft
                    </p>
                    <p>{result.formValues.sunExposure}</p>
                    <p>
                      {new Date(result.generatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  No result found. Complete the planner form first.
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

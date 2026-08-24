import Image from "next/image";
import { Flower2, Leaf, Shovel, Sprout } from "lucide-react";

const features = [
  {
    title: "Guided Inputs",
    body: "Simple prompts for ZIP, sun, and size keep decision fatigue low while still collecting what matters.",
  },
  {
    title: "Plant Intent",
    body: "Pick flowers, vegetables, herbs, medicinal plants, basic plants, or all of the above with guided examples.",
  },
  {
    title: "AI-Ready Output",
    body: "Generate a structured garden prompt you can use immediately for layout and planting suggestions.",
  },
];

const steps = [
  {
    number: "01",
    title: "Land Here",
    body: "Get oriented quickly and see exactly what FloraScape will generate.",
  },
  {
    number: "02",
    title: "Open Planner",
    body: "Jump into the questionnaire in one click and add your garden details.",
  },
  {
    number: "03",
    title: "Generate Prompt",
    body: "Review your personalized result and iterate toward your ideal layout.",
  },
];

export default function Home() {
  return (
    <div className="landing-page">
      <nav>
        <div className="container nav-inner">
          <a className="logo" href="/" aria-label="FloraScape home">
            FloraScape
          </a>
          <div className="nav-links">
            <a href="#how-it-works">How It Works</a>
            <a href="#features">Features</a>
            <a href="/planner" className="btn">
              Start Planning
            </a>
          </div>
        </div>
      </nav>

      <main id="top">
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <div className="eyebrow">Cozy AI Garden Design</div>
              <h1>Plan a garden that actually fits your space and climate.</h1>
              <p>
                FloraScape turns your ZIP code, sunlight conditions, and plant
                goals into a practical starter layout. Begin with a friendly
                questionnaire, then generate a personalized garden blueprint.
              </p>
              <div className="hero-actions">
                <a href="/planner" className="btn">
                  <Sprout size={18} strokeWidth={2.3} />
                  Build My Garden Plan
                </a>
                <a href="#features" className="btn secondary-btn">
                  <Flower2 size={18} strokeWidth={2.2} />
                  See How It Works
                </a>
              </div>
            </div>

            <div className="mockup-wrap">
              <div className="floating-card">
                <Image
                  src="/garden-layout-example.png"
                  alt="FloraScape planner example layout"
                  width={1024}
                  height={768}
                  priority
                />
              </div>

              <div className="badge one">
                <h4>Phase 1 MVP</h4>
                <p>
                  Questionnaire, validation, and AI prompt generation in one
                  clean flow.
                </p>
              </div>

              <div className="badge two">
                <h4>Natural Next Step</h4>
                <p>
                  Move straight into the planner and start building your
                  garden.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="features">
          <div className="container">
            <div className="section-header">
              <h2>What makes the flow useful</h2>
              <p>
                We focus on practical setup first, then give you a clean
                handoff into the planner so building your garden feels easy.
              </p>
            </div>

            <div className="features-grid">
              {features.map((feature) => (
                <article className="feature-card" key={feature.title}>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section steps-section" id="how-it-works">
          <div className="container">
            <div className="section-header">
              <h2>Natural flow into building</h2>
              <p>
                Keep momentum from inspiration to a usable garden prompt
                without switching tools.
              </p>
            </div>

            <div className="steps">
              {steps.map((step) => (
                <article className="step" key={step.number}>
                  <div className="step-number">{step.number}</div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </article>
              ))}
            </div>

            <div className="cta">
              <h2>Start building your garden today.</h2>
              <p>
                You can begin with quick details now, generate your first
                tailored prompt, and use that as the foundation for your
                editable layout flow in the next phase.
              </p>
              <a href="/planner" className="btn">
                <Shovel size={18} strokeWidth={2.3} />
                Open Garden Planner
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer>© 2026 FloraScape - Grow beautifully.</footer>
    </div>
  );
}

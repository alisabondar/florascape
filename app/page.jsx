import Image from "next/image";
import { Flower2, Leaf, Shovel, Sprout } from "lucide-react";

const features = [
  {
    title: "Built for Your Space",
    body: "Plan an in-ground plot, raised beds, or containers using the dimensions and sunlight each growing area actually has.",
  },
  {
    title: "A Garden You Can See",
    body: "Turn your preferences into a hand-drawn interactive sketch with clear plant areas and practical placement reasoning.",
  },
  {
    title: "Guidance You Can Use",
    body: "Get companion tips, watering advice, common mistakes, quantities, spacing, and seasonal planting guidance in one plan.",
  },
];

const steps = [
  {
    number: "01",
    title: "Describe Your Space",
    body: "Share your ZIP code, garden type, dimensions, sunlight, and what you want to grow.",
  },
  {
    number: "02",
    title: "Generate a Blueprint",
    body: "FloraScape arranges realistic plant groups inside a sketch sized to your growing areas.",
  },
  {
    number: "03",
    title: "Plant with Confidence",
    body: "Use the linked tips and planting guide, adjust the sketch, and print the plan when you are ready.",
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
              <h1>Plan a garden that actually fits your space and climate.</h1>
              <p>
                FloraScape turns your growing space, sunlight, location, and
                plant goals into an illustrated blueprint with practical
                planting and care guidance for beginners.
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
                  src="/florascape-planner-example.png"
                  alt="FloraScape garden blueprint with editable plant groups and six illustrated garden beds"
                  width={1704}
                  height={1726}
                  priority
                />
              </div>

              <div className="badge one">
                <h4>Sized to Your Garden</h4>
                <p>
                  Every plot, bed, and container is drawn in proportion to the
                  dimensions you enter.
                </p>
              </div>

              <div className="badge two">
                <h4>From Idea to Planting</h4>
                <p>
                  See what goes where, why it belongs there, and how to get it
                  growing.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="features">
          <div className="container">
            <div className="section-header">
              <h2>Everything you need to start planning</h2>
              <p>
                Make the early decisions with confidence, then carry one clear
                plan into your yard, beds, or containers.
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
              <h2>From an empty space to a workable plan</h2>
              <p>
                FloraScape keeps the process approachable while still giving
                you the dimensions, timing, and care details that matter.
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
                Bring your dimensions and a few ideas. We will help turn them
                into a garden blueprint you can adjust, print, and plant.
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

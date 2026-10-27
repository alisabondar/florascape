import type { CSSProperties } from "react";
import Link from "next/link";
import PixelPlot from "./components/PixelPlot";
import LevelBadge from "./components/progress/LevelBadge";
import PixelSprite from "./components/PixelSprite";
import { createExampleGardenPlan } from "../lib/garden-plan";
import { findPlantFacts } from "../lib/plant-facts";
import "./home.css";

interface HeroCard {
  plant: string;
  color: string;
  bg: string;
}

const heroCards: HeroCard[] = [
  { plant: "Tomato", color: "#a33224", bg: "#fde3d6" },
  { plant: "Basil", color: "#3f6b35", bg: "#e2f0d4" },
  { plant: "Lettuce", color: "#2d6c8a", bg: "#dcecf2" },
  { plant: "Sunflower", color: "#8a5a00", bg: "#fdf0c8" },
];

const SUN_SHORT: Record<string, string> = { full_sun: "Full", partial_shade: "Part", shade: "Shade" };

/** Rarity and stats from the real plant facts, using the same rules as the results album. */
function cardDetails(plant: string) {
  const fact = findPlantFacts(plant);
  const rarity = fact?.easyCare ? "Easy" : (fact?.daysToMaturity ?? 0) >= 90 ? "Patient" : "Common";
  const stats: [string, string][] = [
    ["Sun", fact ? SUN_SHORT[fact.sunNeeds] ?? "Full" : "Full"],
    ["Days", fact ? String(fact.daysToMaturity) : "—"],
  ];
  return { rarity, stats };
}

interface Feature {
  title: string;
  body: string;
  tag: string;
  sprite: string;
  color: string;
}

const features: Feature[] = [
  { title: "Real climate data", body: "Your ZIP sets the hardiness zone and last and first frost dates.", tag: "Zone", sprite: "Pea", color: "#2d6c8a" },
  { title: "A filled pixel garden", body: "See every bed planted, then edit groups or drag to swap them.", tag: "Plot", sprite: "Carrot", color: "#3f6b35" },
  { title: "Planting guide", body: "What to start indoors, sow, or transplant, ordered by timing.", tag: "Timing", sprite: "Radish", color: "#8a5a00" },
  { title: "Shopping list", body: "Seeds and starts with how much to buy for your beds.", tag: "Supplies", sprite: "Potato", color: "#a33224" },
  { title: "Neighbor check", body: "Flags good companions and plants that shouldn't share a bed.", tag: "Pairs", sprite: "Onion", color: "#3f6b35" },
  { title: "Crop rotation", body: "Notes on what to move where next season to keep soil healthy.", tag: "Seasons", sprite: "Pumpkin", color: "#8a5a00" },
  { title: "Calendar export", body: "Add planting dates to your own calendar in one click.", tag: "Dates", sprite: "Strawberry", color: "#2d6c8a" },
  { title: "Ask about my garden", body: "Chat with questions about your plan and get answers for it.", tag: "Chat", sprite: "Spinach", color: "#a33224" },
];

const levels = [
  { title: "Location & type", body: "Enter your ZIP code and pick in-ground, raised beds, or containers." },
  { title: "Your space", body: "Add each bed's size and which side gets the sun." },
  { title: "What to grow", body: "Choose plant categories like vegetables, herbs, or flowers." },
];

export default function Home() {
  const examplePlan = createExampleGardenPlan();

  return (
    <div className="landing-page home-album">
      <nav>
        <div className="container nav-inner">
          <Link className="logo" href="/" aria-label="FloraScape home">
            FloraScape
          </Link>
          <div className="nav-links">
            <LevelBadge />
            <a href="#how-it-works">How It Works</a>
            <a href="#features">Features</a>
            <Link href="/planner" className="btn">
              Start Planning
            </Link>
          </div>
        </div>
      </nav>

      <main id="top">
        <section className="home-hero" aria-labelledby="home-title">
          <div className="container home-hero-grid">
            <div className="home-cover">
              <div className="home-cover-rings" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="home-cover-body">
                <p className="home-cover-vol">Vol. 1 · Garden Collection</p>
                <div className="home-plate">
                  <h1 id="home-title">FloraScape</h1>
                  <p className="home-tagline">Collect a garden that fits your space and climate.</p>
                </div>
                <p className="home-cover-lead">
                  Answer three quick questions and FloraScape fills a pixel garden sized to your beds, with
                  planting dates for your frost zone and a guide you can actually follow.
                </p>
                <div className="home-actions">
                  <Link href="/planner" className="btn">
                    Start your album
                  </Link>
                  <a href="#how-it-works" className="home-btn-ghost">
                    See how it works
                  </a>
                </div>
              </div>
            </div>

            <div className="home-showcase">
              <ul className="home-fan" aria-label="Sample plant cards">
                {heroCards.map((card, index) => (
                  <li
                    key={card.plant}
                    className="home-card"
                    style={{ "--rar": card.color, "--bg": card.bg, "--i": index } as CSSProperties}
                  >
                    <span className="home-rarity px">{cardDetails(card.plant).rarity}</span>
                    <div className="home-card-art">
                      <PixelSprite plantName={card.plant} scale={3} motion="grow" delay={index * 0.3} />
                    </div>
                    <p className="home-card-name">{card.plant}</p>
                    <dl className="home-stats">
                      {cardDetails(card.plant).stats.map(([label, value]) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ul>

              {examplePlan ? (
                <figure className="home-sample">
                  <figcaption className="home-kicker">Sample page · example garden</figcaption>
                  <PixelPlot layout={examplePlan.layout} showTags={false} maxTile={22} animate={false} />
                </figure>
              ) : null}
            </div>
          </div>
        </section>

        <section className="home-section" id="features" aria-labelledby="features-title">
          <div className="container home-page-sheet">
            <header className="home-section-head">
              <p className="home-kicker">Page 2 · The collection</p>
              <h2 id="features-title">Everything in your album</h2>
              <p>Each plan comes with the full set. No cards to trade for.</p>
            </header>
            <ul className="home-features">
              {features.map((feature) => (
                <li key={feature.title} className="home-feature" style={{ "--rar": feature.color } as CSSProperties}>
                  <span className="home-rarity px">{feature.tag}</span>
                  <div className="home-feature-art">
                    <PixelSprite plantName={feature.sprite} scale={2} motion="sway" />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="home-section" id="how-it-works" aria-labelledby="how-title">
          <div className="container home-page-sheet">
            <header className="home-section-head">
              <p className="home-kicker">Page 3 · Season map</p>
              <h2 id="how-title">Three levels to a full plan</h2>
              <p>Three short steps, then your album is ready to explore and edit.</p>
            </header>
            <ol className="home-levels">
              {levels.map((level, index) => (
                <li key={level.title} className="home-level">
                  <span className="home-level-num px" aria-hidden="true">
                    {index + 1}
                  </span>
                  <h3>
                    <span className="home-sr">Level {index + 1}: </span>
                    {level.title}
                  </h3>
                  <p>{level.body}</p>
                </li>
              ))}
              <li className="home-level home-level-goal">
                <span className="home-level-num px" aria-hidden="true">
                  ★
                </span>
                <h3>Collect your plan</h3>
                <p>Get your filled garden, guide, shopping list, and calendar.</p>
              </li>
            </ol>
          </div>
        </section>

        <section className="home-section" aria-labelledby="cta-title">
          <div className="container home-cta">
            <span className="home-stamp px" aria-hidden="true">
              Ready to plant
            </span>
            <h2 id="cta-title">Start your first page today.</h2>
            <p>Bring your bed sizes and a few ideas. We&apos;ll fill in the rest, and you can swap anything you like.</p>
            <Link href="/planner" className="btn">
              Open the planner
            </Link>
          </div>
        </section>
      </main>

      <footer>© 2026 FloraScape - Grow beautifully.</footer>
    </div>
  );
}

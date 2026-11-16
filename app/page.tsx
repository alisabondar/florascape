import type { CSSProperties } from "react";
import Link from "next/link";
import GardenDiorama from "./components/GardenDiorama";
import NavAlbumsLink from "./components/albums/NavAlbumsLink";
import LevelBadge from "./components/progress/LevelBadge";
import AlbumShelf from "./components/albums/AlbumShelf";
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
  { plant: "Lavender", color: "#5e2f6e", bg: "#efe2f2" },
  { plant: "Swiss Chard", color: "#3f6b35", bg: "#e2f0d4" },
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
  { title: "Season view", body: "Your beds in 3D. Drag through the year to see what to plant, what to pick, and when space frees up.", tag: "Season", sprite: "Zinnia", color: "#3f6b35" },
  { title: "Real climate data", body: "Your ZIP sets the hardiness zone and your last and first frost dates.", tag: "Zone", sprite: "Pea", color: "#2d6c8a" },
  { title: "Planting guide", body: "What to sow or transplant and when, with dates you can add to your calendar.", tag: "Timing", sprite: "Radish", color: "#8a5a00" },
  { title: "Shopping list", body: "Seeds, starts, and soil, with how much to buy for your beds.", tag: "Supplies", sprite: "Potato", color: "#a33224" },
  { title: "Neighbor check", body: "Flags good companions and plants that shouldn't share a bed.", tag: "Pairs", sprite: "Onion", color: "#2d6c8a" },
  { title: "Crop rotation", body: "Save each season and see what to move where next year.", tag: "Seasons", sprite: "Pumpkin", color: "#8a5a00" },
];

const steps = [
  { title: "Where", body: "Your ZIP code and garden type" },
  { title: "Your space", body: "Each bed's size and sunny side" },
  { title: "What to grow", body: "Vegetables, herbs, flowers, or all" },
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
            <a href="#how-it-works">How it works</a>
            <a href="#features">Features</a>
            <NavAlbumsLink />
            <Link href="/planner" className="btn">
              Start planning
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
                <div className="home-plate">
                  <h1 id="home-title">FloraScape</h1>
                  <p className="home-tagline">Collect a garden that fits your space and climate.</p>
                </div>
                <p className="home-cover-lead">
                  Three quick questions, then a planted garden with dates for your frost zone.
                </p>
                <ol className="home-steps" id="how-it-works" aria-label="How it works">
                  {steps.map((step, index) => (
                    <li key={step.title}>
                      <span className="home-step-num px" aria-hidden="true">{index + 1}</span>
                      <span>
                        <b>{step.title}</b>
                        {step.body}
                      </span>
                    </li>
                  ))}
                </ol>
                <div className="home-actions">
                  <Link href="/planner" className="btn">
                    Start planning
                  </Link>
                  <a href="#features" className="home-btn-ghost">
                    See what you get
                  </a>
                </div>
              </div>
            </div>

            <div className="home-showcase">

              {examplePlan ? (
                <figure className="home-sample">
                  <figcaption className="home-kicker">Example garden · drag through the season</figcaption>
                  {/* Opens in July, when most of the sample is ready to pick. */}
                  <GardenDiorama layout={examplePlan.layout} initialMonth={6} showTasks={false} showLabels={false} />
                </figure>
              ) : null}
            </div>
          </div>
        </section>

        {/* Saved plans on this device; renders nothing until there's one. */}
        <div className="container home-albums" id="albums">
          <AlbumShelf />
        </div>


        <section className="home-section" id="features" aria-labelledby="features-title">
          <div className="container home-page-sheet">
            <header className="home-section-head">
              <h2 id="features-title">Everything in your album</h2>
              <p>Each plan comes with the full set. No cards to trade for.</p>
            </header>
            <ul className="home-features">
              {features.map((feature) => (
                <li key={feature.title} className="home-feature" style={{ "--rar": feature.color } as CSSProperties}>
                  <span className="home-rarity px">{feature.tag}</span>
                  <div className="home-feature-art">
                    <PixelSprite plantName={feature.sprite} scale={3} motion="sway" />
                  </div>
                  <h3>{feature.title}</h3>
                  <p>{feature.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="home-section" aria-labelledby="cta-title">
          <div className="container home-cta">
            <div className="home-cta-text">
              <h2 id="cta-title">Ready to plant?</h2>
              <p>Start your album: every plant you grow becomes a card to collect.</p>
              <Link href="/planner" className="btn">
                Start planning
              </Link>
            </div>
                <ul className="home-fan" aria-label="Sample plant cards">
                  {heroCards.map((card, index) => (
                    <li
                      key={card.plant}
                      className="home-card"
                      style={{ "--rar": card.color, "--bg": card.bg, "--i": index } as CSSProperties}
                    >
                      <span className="home-rarity px">{cardDetails(card.plant).rarity}</span>
                      <div className="home-card-art">
                        <PixelSprite plantName={card.plant} scale={3} motion="sway" delay={index * 0.3} />
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
          </div>
        </section>
      </main>

      <footer>© 2026 FloraScape - Grow beautifully.</footer>
    </div>
  );
}

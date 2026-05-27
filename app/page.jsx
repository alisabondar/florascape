import Image from "next/image";
import {
  CalendarDays,
  Droplets,
  Flower2,
  Leaf,
  MapPin,
  Ruler,
  Shovel,
  Sparkles,
  Sprout,
} from "lucide-react";

const features = [
  {
    Icon: Sparkles,
    title: "Intelligent Garden Planning",
    body: "Generate complete layouts based on your yard size, experience level, goals, sunlight conditions, and climate zone.",
  },
  {
    Icon: Sprout,
    title: "Plant Compatibility Guidance",
    body: "Discover which vegetables, herbs, flowers, and fruit trees thrive together while avoiding harmful combinations.",
  },
  {
    Icon: MapPin,
    title: "Local Nursery & Store Finder",
    body: "Find nearby nurseries, garden centers, and hardware stores carrying the exact plants and supplies you need.",
  },
  {
    Icon: CalendarDays,
    title: "Seasonal Planting Calendars",
    body: "Receive customized planting and harvesting schedules tailored to your local weather patterns.",
  },
  {
    Icon: Ruler,
    title: "Beautiful Layout Visualizations",
    body: "Turn rough ideas into polished, inspiring garden concepts with a hand-crafted visual aesthetic.",
  },
  {
    Icon: Droplets,
    title: "Maintenance & Watering Tips",
    body: "Get realistic care guidance based on how much time, water, and effort you want to invest.",
  },
];

const steps = [
  {
    number: "01",
    title: "Tell us about your space",
    body: "Share your location, climate, sunlight conditions, available space, and gardening goals.",
  },
  {
    number: "02",
    title: "Receive a personalized plan",
    body: "FloraScape generates layouts, plant recommendations, schedules, and gardening strategies designed specifically for you.",
  },
  {
    number: "03",
    title: "Build your dream garden",
    body: "Source your plants locally, follow guided tips, and grow a space that evolves beautifully season after season.",
  },
];

export default function Home() {
  return (
    <>
      <nav>
        <div className="container nav-inner">
          <a className="logo" href="#top" aria-label="FloraScape home">
            FloraScape
          </a>

          <div className="nav-links" aria-label="Primary navigation">
            <a href="#features">Features</a>
            <a href="#planner">Garden Planner</a>
            <a href="#plant-finder">Plant Finder</a>
            <a href="#start" className="btn">
              <Leaf size={18} strokeWidth={2.3} />
              Start Designing
            </a>
          </div>
        </div>
      </nav>

      <main id="top">
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <div className="eyebrow">AI-Powered Garden Planning</div>

              <h1>Design the garden you've always imagined.</h1>

              <p>
                FloraScape helps you plan beautiful, productive, and realistic
                outdoor spaces based on your climate, sunlight, goals,
                maintenance level, and available space. Get tailored layouts,
                plant suggestions, companion planting tips, and nearby nursery
                recommendations, all in one inspiring experience.
              </p>

              <div className="hero-actions">
                <a href="#start" className="btn">
                  <Sprout size={18} strokeWidth={2.3} />
                  Start Your Garden
                </a>

                <a href="#planner" className="btn secondary-btn">
                  <Flower2 size={18} strokeWidth={2.2} />
                  View Example Plans
                </a>
              </div>

            </div>

            <div className="mockup-wrap" id="planner">
              <div className="floating-card">
                <Image
                  src="/garden-layout-example.png"
                  alt="FloraScape garden planner mockup"
                  width={1024}
                  height={768}
                  priority
                />
              </div>

              <div className="badge one">
                <h4>Smart Climate Matching</h4>
                <p>
                  Personalized recommendations based on your USDA zone,
                  sunlight, soil, and watering habits.
                </p>
              </div>

              <div className="badge two" id="plant-finder">
                <h4>Local Nursery Finder</h4>
                <p>
                  Instantly locate nearby stores for seeds, flowers, soil,
                  raised beds, and native plants.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="features">
          <div className="container">
            <div className="section-header">
              <h2>Everything you need to build your ideal outdoor space</h2>

              <p>
                Whether you're designing a raised-bed vegetable garden,
                pollinator sanctuary, modern backyard retreat, or
                self-sufficient homestead, FloraScape adapts to your vision and
                turns inspiration into actionable plans.
              </p>
            </div>

            <div className="features-grid">
              {features.map(({ Icon, ...feature }) => (
                <article className="feature-card" key={feature.title}>
                  <div className="feature-icon" aria-hidden="true">
                    <Icon size={28} strokeWidth={2.1} />
                  </div>

                  <h3>{feature.title}</h3>

                  <p>{feature.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section steps-section">
          <div className="container">
            <div className="section-header">
              <h2>How FloraScape works</h2>

              <p>Planning your dream garden should feel inspiring, not overwhelming.</p>
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
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="cta" id="start">
              <h2>Start designing your future garden today.</h2>

              <p>
                From beginner-friendly raised beds to full backyard ecosystems,
                FloraScape helps transform inspiration into thriving outdoor
                spaces with intelligent guidance every step of the way.
              </p>

              <a href="#top" className="btn">
                <Shovel size={18} strokeWidth={2.3} />
                Create My Garden Plan
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer>© 2026 FloraScape - Grow beautifully.</footer>
    </>
  );
}

import PixelPlot from "../PixelPlot";
import type { LookDashboardProps } from "./types";

// Placeholder: replaced by the seed-rack look.
export default function SeedRackDashboard({ plan, onOpenGuide }: LookDashboardProps) {
  return (
    <section className="look-dashboard look-seed-rack-dashboard">
      <PixelPlot layout={plan.layout} onZoneSelect={onOpenGuide} />
    </section>
  );
}

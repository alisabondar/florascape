import PixelPlot from "../PixelPlot";
import type { LookDashboardProps } from "./types";

// Placeholder: replaced by the album look.
export default function AlbumDashboard({ plan, onOpenGuide }: LookDashboardProps) {
  return (
    <section className="look-dashboard look-album-dashboard">
      <PixelPlot layout={plan.layout} onZoneSelect={onOpenGuide} />
    </section>
  );
}

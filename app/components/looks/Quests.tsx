import PixelPlot from "../PixelPlot";
import type { LookDashboardProps } from "./types";

// Placeholder: replaced by the quests look.
export default function QuestsDashboard({ plan, onOpenGuide }: LookDashboardProps) {
  return (
    <section className="look-dashboard look-quests-dashboard">
      <PixelPlot layout={plan.layout} onZoneSelect={onOpenGuide} />
    </section>
  );
}

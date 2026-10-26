import PixelPlot from "../PixelPlot";
import type { LookDashboardProps } from "./types";

// Placeholder: replaced by the quest-binder look.
export default function QuestBinderDashboard({ plan, onOpenGuide }: LookDashboardProps) {
  return (
    <section className="look-dashboard look-quest-binder-dashboard">
      <PixelPlot layout={plan.layout} onZoneSelect={onOpenGuide} />
    </section>
  );
}

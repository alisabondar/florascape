import type { ComponentType } from "react";
import AlbumDashboard from "./Album";
import QuestBinderDashboard from "./QuestBinder";
import QuestsDashboard from "./Quests";
import SeedRackDashboard from "./SeedRack";
import type { LookDashboardProps, ResultLookId } from "./types";

export const LOOK_DASHBOARDS: Record<Exclude<ResultLookId, "classic">, ComponentType<LookDashboardProps>> = {
  quests: QuestsDashboard,
  album: AlbumDashboard,
  "quest-binder": QuestBinderDashboard,
  "seed-rack": SeedRackDashboard,
};

export { RESULT_LOOKS, isResultLook } from "./types";
export type { LookDashboardProps, ResultLookId } from "./types";

import { fetchMetaDashboard, isMetaConfigured } from "./meta/client";
import { buildMockDashboard } from "./meta/mock";
import type { DashboardData } from "./meta/types";

/**
 * Single entry point the UI uses. Returns live Meta data when credentials are
 * configured, otherwise deterministic mock data so the dashboard always renders.
 */
export async function getDashboardData(datePreset = "last_30d"): Promise<DashboardData> {
  if (isMetaConfigured()) {
    try {
      return await fetchMetaDashboard(datePreset);
    } catch (err) {
      console.error("[meta] falling back to mock data:", err);
    }
  }
  return buildMockDashboard();
}

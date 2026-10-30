import { request } from "@/services/api";
import type { DashboardSummary } from "@/types/finance";
export const dashboardService = {
  get: (month: string) =>
    request<DashboardSummary>("/dashboard?month=" + month),
};

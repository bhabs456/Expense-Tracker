import { request } from "@/services/api";
import type { AnalyticsSummary } from "@/types/finance";
export const analyticsService = {
  get: (month: string) =>
    request<AnalyticsSummary>("/analytics?month=" + month),
};

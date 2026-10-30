import { request } from "@/services/api";
import type { SavingsSummary } from "@/types/finance";
export const savingsService = {
  summary: () => request<SavingsSummary>("/savings/summary"),
};

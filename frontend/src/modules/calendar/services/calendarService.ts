import { request } from "@/services/api";
import type { CalendarSummary } from "@/types/finance";
export const calendarService = {
  get: (month: string) => request<CalendarSummary>("/calendar?month=" + month),
};

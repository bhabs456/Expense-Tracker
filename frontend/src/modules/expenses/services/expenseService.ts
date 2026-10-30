import { request } from "@/services/api";
import { query } from "@/utils/format";
import type {
  Expense,
  ExpenseInput,
  BatchRow,
  Confirmation,
  Filters,
  Paginated,
  Refund,
} from "@/types/finance";
export const expenseService = {
  list: (filters: Filters, page: number) =>
    request<Paginated<Expense>>("/expenses?" + query({ ...filters, page })),
  batch: (items: BatchRow[], confirmation: Confirmation) =>
    request<{ items: ExpenseInput[] }>("/expenses/batch", "POST", {
      items,
      ...confirmation,
    }),
  update: (id: number, body: ExpenseInput, confirmation: Confirmation) =>
    request<ExpenseInput>(
      "/expenses/" + id + "?" + query(confirmation),
      "PATCH",
      body,
    ),
  remove: (id: number) =>
    request<{ deleted: boolean }>(
      "/expenses/" + id + "?confirm=true",
      "DELETE",
    ),
  refund: (id: number, body: Pick<Refund, "amount" | "date" | "notes">) =>
    request<Refund>("/expenses/" + id + "/refunds", "POST", body),
  removeRefund: (id: number) =>
    request<{ deleted: boolean }>("/refunds/" + id + "?confirm=true", "DELETE"),
};

import { request } from "@/services/api";
import { query } from "@/utils/format";
import type {
  SavingsTransaction,
  SavingsInput,
  Confirmation,
  Filters,
  Paginated,
} from "@/types/finance";
export const ledgerService = {
  list: (filters: Filters, page: number) =>
    request<Paginated<SavingsTransaction>>(
      "/savings/transactions?" + query({ ...filters, page }),
    ),
  save: (body: SavingsInput, flags: Confirmation, id?: number) =>
    request<SavingsInput>(
      "/savings/transactions" + (id ? "/" + id : ""),
      id ? "PATCH" : "POST",
      {
        ...body,
        confirm_negative_savings: flags.confirm_negative_savings || false,
      },
    ),
  remove: (id: number, flags: Confirmation) =>
    request<{ deleted: boolean }>(
      "/savings/transactions/" + id + "?" + query({ confirm: true, ...flags }),
      "DELETE",
    ),
};

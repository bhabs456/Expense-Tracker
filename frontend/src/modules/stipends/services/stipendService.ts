import { request } from "@/services/api";
import type { Stipend, StipendInput } from "@/types/finance";
export const stipendService = {
  list: () => request<Stipend[]>("/stipends"),
  save: (body: StipendInput, id?: number) =>
    request<Stipend>(
      "/stipends" + (id ? "/" + id : ""),
      id ? "PATCH" : "POST",
      body,
    ),
  remove: (id: number) =>
    request<{ deleted: boolean }>(
      "/stipends/" + id + "?confirm=true",
      "DELETE",
    ),
};

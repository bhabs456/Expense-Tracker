import { request } from "@/services/api";
import type {
  Subscription,
  SubscriptionInput,
  SubscriptionEdit,
} from "@/types/finance";
export const subscriptionService = {
  list: () => request<Subscription[]>("/subscriptions"),
  create: (body: SubscriptionInput) =>
    request<Subscription>("/subscriptions", "POST", body),
  update: (id: number, body: SubscriptionEdit) =>
    request<Subscription>("/subscriptions/" + id, "PATCH", body),
  status: (id: number, action: "pause" | "resume" | "cancel") =>
    request<Subscription>("/subscriptions/" + id + "/" + action, "POST"),
  remove: (id: number) =>
    request<{ deleted: boolean }>(
      "/subscriptions/" + id + "?confirm=true",
      "DELETE",
    ),
};

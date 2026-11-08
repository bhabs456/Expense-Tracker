"use client";
import { Alert } from "@/components/ui/Alert";
import { useState } from "react";
import { Plus, Repeat, Trash2 } from "lucide-react";
import {
  PageHeader,
  Loading,
  ErrorState,
  Empty,
} from "@/components/ui/Primitives";
import { useResource } from "@/hooks/useResource";
import { useMutation } from "@/hooks/useMutation";
import { money } from "@/utils/format";
import type { Subscription } from "@/types/finance";
import { subscriptionService } from "../services/subscriptionService";
import { SubscriptionEditor } from "./SubscriptionEditor";
export function SubscriptionsPage() {
  const { data, loading, error, reload } = useResource(
    subscriptionService.list,
  );
  const { run, busy } = useMutation();
  const [editor, setEditor] = useState<Subscription | "new" | null>(null);
  return (
    <>
      <PageHeader
        title="Subscriptions"
        description="Keep recurring costs in view."
      >
        <button className="primary" onClick={() => setEditor("new")}>
          <Plus size={17} /> Add subscription
        </button>
      </PageHeader>
      <Alert variant="info">
        Track one billing cycle or renew every 30 days. You can change the
        billing option in Edit.
      </Alert>
      {error ? (
        <ErrorState message={error} retry={reload} />
      ) : loading ? (
        <Loading />
      ) : data?.length ? (
        <div className="subscription-grid">
          {data.map((r) => (
            <section className="panel subscription-card" key={r.id}>
              <div className="panel-heading">
                <div className="subscription-icon">
                  <Repeat size={22} />
                </div>
                <span
                  className={
                    "pill " + (r.status === "active" ? "positive" : "")
                  }
                >
                  {r.status}
                </span>
              </div>
              <h2>{r.name}</h2>
              <strong>
                {money(r.amount)}
                <small>{r.one_cycle ? " one time" : " / 30 days"}</small>
              </strong>
              <p>
                {r.category}
                {r.subcategory ? " → " + r.subcategory : ""} ·{" "}
                {r.payment_method}
              </p>
              <dl>
                <dt>Billing cycle</dt>
                <dd>{r.one_cycle ? "One billing cycle" : "Every 30 days"}</dd>
                <dt>First payment</dt>
                <dd>
                  {r.first_payment_status === "paid"
                    ? "Recorded as paid"
                    : r.first_payment_status === "deleted"
                      ? "Payment record deleted"
                      : r.first_payment_status === "scheduled"
                        ? "Scheduled · not paid yet"
                        : "Not recorded"}
                </dd>
                <dt>Next charge</dt>
                <dd>
                  {r.next_charge ||
                    (r.one_cycle && r.status === "active" ? "No renewal" : "—")}
                </dd>
                <dt>First payment date</dt>
                <dd>{r.first_payment_date}</dd>
                {!r.one_cycle && (
                  <>
                    <dt>First scheduled charge</dt>
                    <dd>{r.first_billing_date}</dd>
                  </>
                )}
              </dl>
              <div className="subscription-actions">
                <button onClick={() => setEditor(r)}>Edit</button>
                {r.status !== "canceled" && (
                  <>
                    <button
                      disabled={busy}
                      onClick={() =>
                        run(
                          () =>
                            subscriptionService.status(
                              r.id,
                              r.status === "paused" ? "resume" : "pause",
                            ),
                          "Subscription updated",
                        )
                      }
                    >
                      {r.status === "paused" ? "Resume" : "Pause"}
                    </button>
                    <button
                      disabled={busy}
                      onClick={() => {
                        if (
                          window.confirm(
                            "Cancel future renewals? Historical expenses stay saved.",
                          )
                        )
                          run(
                            () => subscriptionService.status(r.id, "cancel"),
                            "Subscription canceled",
                          );
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
                <button
                  aria-label="Delete subscription"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        "Delete this subscription? All historical expenses will be preserved.",
                      )
                    )
                      run(
                        () => subscriptionService.remove(r.id),
                        "Subscription deleted",
                      );
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty text="Add a 30-day subscription to track its renewals automatically." />
        </section>
      )}
      {editor && (
        <SubscriptionEditor
          subscription={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}

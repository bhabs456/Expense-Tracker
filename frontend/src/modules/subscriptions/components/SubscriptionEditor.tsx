"use client";
import { AmountInput } from "@/components/ui/AmountInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Primitives";
import { useWorkspace } from "@/components/layouts/WorkspaceProvider";
import { useMutation } from "@/hooks/useMutation";
import { ApiError } from "@/services/api";
import { TRACKING_START } from "@/constants/finance";
import { money, todayInIndia, afterDays } from "@/utils/format";
import type { Subscription, SubscriptionInput, Expense } from "@/types/finance";
import { subscriptionService } from "../services/subscriptionService";
export function SubscriptionEditor({
  subscription,
  onClose,
}: {
  subscription?: Subscription;
  onClose: () => void;
}) {
  const { catalog, preferences } = useWorkspace();
  const today = catalog?.today || todayInIndia();
  const { run, busy } = useMutation();
  const [dirty, setDirty] = useState(false),
    [candidates, setCandidates] = useState<Expense[]>([]);
  const [value, setValue] = useState<SubscriptionInput>({
    name: subscription?.name || "",
    amount: subscription?.amount || "",
    start_date:
      subscription?.start_date ||
      (today < TRACKING_START ? TRACKING_START : today),
    category: subscription?.category || "Subscriptions",
    subcategory: subscription?.subcategory || "",
    payment_method:
      subscription?.payment_method ||
      preferences?.default_payment_method ||
      "UPI",
    first_payment_made: false,
    first_billing_date:
      subscription?.first_billing_date ||
      afterDays(today < TRACKING_START ? TRACKING_START : today, 30),
    existing_expense_id: null,
  });
  const change = <K extends keyof SubscriptionInput>(
    key: K,
    v: SubscriptionInput[K],
  ) => {
    setValue({
      ...value,
      [key]: v,
      ...(key === "category" ? { subcategory: "" } : {}),
      ...(key === "start_date" || key === "first_payment_made"
        ? {
            first_billing_date: afterDays(
              key === "start_date" ? String(v) : value.start_date,
              30,
            ),
          }
        : {}),
      ...(key !== "existing_expense_id" ? { existing_expense_id: null } : {}),
    });
    if (key !== "existing_expense_id") setCandidates([]);
    setDirty(true);
  };
  return (
    <Dialog
      title={(subscription ? "Edit" : "Add") + " subscription"}
      onClose={onClose}
      dirty={dirty}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const saved = await run(async () => {
            try {
              return subscription
                ? await subscriptionService.update(subscription.id, {
                    name: value.name,
                    amount: value.amount,
                    category: value.category,
                    subcategory: value.subcategory,
                    payment_method: value.payment_method,
                  })
                : await subscriptionService.create(value);
            } catch (e) {
              if (e instanceof ApiError && e.code === "initial_payment_match")
                setCandidates(e.candidates);
              throw e;
            }
          });
          if (saved) onClose();
        }}
      >
        <div className="form-grid">
          <Field label="Name">
            <input
              required
              maxLength={100}
              value={value.name}
              onChange={(e) => change("name", e.target.value)}
            />
          </Field>
          <Field label="Amount per 30 days (₹)">
            <AmountInput
              required

              placeholder="0"
              min="0.01"
              step="0.01"
              value={value.amount}
              onValueChange={(nextValue) => change("amount", nextValue)}
            />
          </Field>
          <Field label="Category">
            <select
              value={value.category}
              onChange={(e) => change("category", e.target.value)}
            >
              {!catalog?.categories[value.category] && (
                <option value={value.category} disabled>
                  {value.category} (historical)
                </option>
              )}
              {Object.keys(catalog?.categories || {}).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Subcategory">
            <select
              required
              value={value.subcategory}
              onChange={(e) => change("subcategory", e.target.value)}
            >
              <option value="" disabled>
                Choose a subcategory
              </option>
              {value.subcategory &&
                !catalog?.categories[value.category]?.includes(
                  value.subcategory,
                ) && (
                  <option value={value.subcategory} disabled>
                    {value.subcategory} (review required)
                  </option>
                )}
              {catalog?.categories[value.category]?.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Payment method">
            <select
              value={value.payment_method}
              onChange={(e) => change("payment_method", e.target.value)}
            >
              {catalog?.payment_methods.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
        </div>
        {!subscription && (
          <fieldset className="payment-choice">
            <legend>Payment status</legend>
            <label>
              <input
                type="radio"
                name="initial-payment"
                checked={value.first_payment_made}
                onChange={() => change("first_payment_made", true)}
              />
              <span>
                <b>Already paid</b>
                <small>Choose the actual date you paid. Record it once.</small>
              </span>
            </label>
            <label>
              <input
                type="radio"
                name="initial-payment"
                checked={!value.first_payment_made}
                onChange={() => change("first_payment_made", false)}
              />
              <span>
                <b>Not paid yet</b>
                <small>Choose when the first upcoming payment is due.</small>
              </span>
            </label>
          </fieldset>
        )}
        {!subscription && (
          <div className="form-grid">
            {value.first_payment_made && (
              <Field label="Payment date">
                <DatePicker
                  required
                  mode="date"
                  min={TRACKING_START}
                  max={today}
                  value={value.start_date}
                  onValueChange={(date) => change("start_date", date)}
                />
              </Field>
            )}
            <Field label="Next payment date">
              <DatePicker
                required
                mode="date"
                min={
                  value.first_payment_made
                    ? afterDays(value.start_date, 1)
                    : today < TRACKING_START
                      ? TRACKING_START
                      : today
                }
                value={value.first_billing_date}
                onValueChange={(date) => change("first_billing_date", date)}
              />
            </Field>
          </div>
        )}
        <div className="subscription-schedule">
          <span>
            {subscription ? "Next expected payment" : "Next expense date"}
          </span>
          <b>
            {(subscription
              ? subscription.next_charge
              : value.first_billing_date) || "No active renewal"}
          </b>
          <small>
            {subscription
              ? "Every 30 days from the first scheduled charge."
              : `Then ${afterDays(value.first_billing_date, 30)}, continuing every 30 days.`}
          </small>
        </div>
        {candidates.length > 0 && (
          <Field label="Choose the existing initial payment">
            <select
              required
              value={value.existing_expense_id || ""}
              onChange={(e) =>
                change("existing_expense_id", Number(e.target.value) || null)
              }
            >
              <option value="">Choose a matching expense</option>
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.id} · {c.date} · {money(c.amount)} ·{" "}
                  {c.notes || c.category}
                </option>
              ))}
            </select>
          </Field>
        )}
        <p className="muted">
          {subscription
            ? "Changes apply only to future renewals. Existing charges stay unchanged."
            : value.first_payment_made
              ? `One expense is recorded on ${value.start_date}. The next charge uses the date you selected, then repeats every 30 days.`
              : "No expense is recorded for adding this subscription. The first charge is recorded on the selected payment date, then every 30 days. Due charges catch up when the app runs."}
        </p>
        <div className="form-footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            Save subscription
          </button>
        </div>
      </form>
    </Dialog>
  );
}

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
import type {
  BillingMonths,
  Subscription,
  SubscriptionInput,
  Expense,
} from "@/types/finance";
import { subscriptionService } from "../services/subscriptionService";
const BILLING_MONTHS: readonly BillingMonths[] = [1, 3, 6, 9, 12];

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
    one_cycle: subscription?.one_cycle ?? false,
    billing_months: subscription?.billing_months ?? 1,
    first_billing_date:
      subscription?.first_billing_date ||
      afterDays(today < TRACKING_START ? TRACKING_START : today, 30),
    existing_expense_id: null,
  });
  const intervalDays = value.billing_months * 30;
  const paidSingleCycle = value.one_cycle && value.first_payment_made;
  const change = <K extends keyof SubscriptionInput>(
    key: K,
    v: SubscriptionInput[K],
  ) => {
    const next = { ...value, [key]: v };
    if (key === "category") next.subcategory = "";
    const updateDefaultRenewal =
      key === "billing_months" &&
      value.first_payment_made &&
      value.first_billing_date === afterDays(value.start_date, intervalDays);
    if (
      key === "start_date" ||
      key === "first_payment_made" ||
      updateDefaultRenewal
    ) {
      next.first_billing_date = afterDays(
        next.start_date,
        next.first_payment_made ? next.billing_months * 30 : 30,
      );
    }
    if (key !== "existing_expense_id") {
      next.existing_expense_id = null;
      setCandidates([]);
    }
    setValue(next);
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
                    one_cycle: value.one_cycle,
                  })
                : await subscriptionService.create({
                    ...value,
                    first_billing_date: paidSingleCycle
                      ? afterDays(value.start_date, intervalDays)
                      : value.first_billing_date,
                  });
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
          <Field label="Amount per billing cycle (₹)">
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
        <fieldset className="payment-choice">
          <legend>Billing cycle</legend>
          <Field label="Billing interval">
            <select
              disabled={Boolean(subscription)}
              value={value.billing_months}
              onChange={(e) =>
                change(
                  "billing_months",
                  Number(e.target.value) as BillingMonths,
                )
              }
            >
              {BILLING_MONTHS.map((months) => (
                <option key={months} value={months}>
                  {months} {months === 1 ? "month" : "months"} ({months * 30}{" "}
                  days)
                </option>
              ))}
            </select>
          </Field>
          <label>
            <input
              type="checkbox"
              checked={value.one_cycle}
              disabled={subscription?.status === "canceled"}
              onChange={(e) => change("one_cycle", e.target.checked)}
            />
            <span>
              <b>One billing cycle</b>
              <small>
                Record the first payment only. Turn this off in Edit to allow
                future renewals at this interval.
              </small>
            </span>
          </label>
        </fieldset>
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
            {!paidSingleCycle && (
              <Field
                label={
                  value.first_payment_made
                    ? "Next payment date"
                    : "First payment date"
                }
              >
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
            )}
          </div>
        )}
        {!subscription && (
          <div className="subscription-schedule">
            <span>
              {value.one_cycle ? "Only expense date" : "Next expense date"}
            </span>
            <b>
              {paidSingleCycle ? value.start_date : value.first_billing_date}
            </b>
            <small>
              {value.one_cycle
                ? "No automatic renewal."
                : `Then ${afterDays(value.first_billing_date, intervalDays)}, continuing every ${intervalDays} days.`}
            </small>
          </div>
        )}
        {subscription && value.one_cycle === subscription.one_cycle && (
          <div className="subscription-schedule">
            <span>Next expected payment</span>
            <b>{subscription.next_charge || "No active renewal"}</b>
            {!value.one_cycle && (
              <small>
                Every {intervalDays} days from the first scheduled charge.
              </small>
            )}
          </div>
        )}
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
              ? `The payment on ${value.start_date} is recorded once.`
              : "Paisa records the first charge when the selected payment date is due. Due charges catch up when the app runs."}
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

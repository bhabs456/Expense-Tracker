"use client";
import { AmountInput } from "@/components/ui/AmountInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Primitives";
import { ExpenseFields, expenseInput } from "@/components/shared/ExpenseFields";
import { useWorkspace } from "@/components/layouts/WorkspaceProvider";
import { useMutation } from "@/hooks/useMutation";
import { money, todayInIndia } from "@/utils/format";
import type { Expense } from "@/types/finance";
import { expenseService } from "../services/expenseService";
export function ExpenseEditor({
  expense,
  onClose,
}: {
  expense: Expense;
  onClose: () => void;
}) {
  const [value, setValue] = useState(expenseInput(expense));
  const [dirty, setDirty] = useState(false);
  const { run, busy } = useMutation();
  return (
    <Dialog title="Edit expense" onClose={onClose} dirty={dirty}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await run((flags) =>
              expenseService.update(expense.id, value, flags),
            )
          )
            onClose();
        }}
      >
        <ExpenseFields
          value={value}
          onChange={(v) => {
            setValue(v);
            setDirty(true);
          }}
        />
        <div className="form-footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            Save expense
          </button>
        </div>
      </form>
    </Dialog>
  );
}
export function RefundEditor({
  expense,
  onClose,
}: {
  expense: Expense;
  onClose: () => void;
}) {
  const { catalog } = useWorkspace();
  const today = catalog?.today || todayInIndia();
  const [value, setValue] = useState({ amount: "", date: today, notes: "" });
  const { run, busy } = useMutation();
  const remaining = Number(expense.amount) - Number(expense.refunded_amount);
  return (
    <Dialog title="Add refund" onClose={onClose} dirty={!!value.amount}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await run(
              () => expenseService.refund(expense.id, value),
              "Refund recorded",
            )
          )
            onClose();
        }}
      >
        <p className="muted">
          Original {money(expense.amount)} · Refunded{" "}
          {money(expense.refunded_amount)} · Remaining {money(remaining)}
        </p>
        <div className="form-grid">
          <Field label="Refund amount (₹)">
            <AmountInput
              required

              placeholder="0"
              min="0.01"
              max={remaining}
              step="0.01"
              value={value.amount}
              onValueChange={(nextValue) =>
                setValue({ ...value, amount: nextValue })
              }
            />
          </Field>
          <Field label="Refund date">
            <DatePicker
              required
              mode="date"
              min={expense.date}
              max={today}
              value={value.date}
              onValueChange={(nextValue) =>
                setValue({ ...value, date: nextValue })
              }
            />
          </Field>
          <Field label="Notes">
            <input
              maxLength={2000}
              value={value.notes}
              onChange={(e) => setValue({ ...value, notes: e.target.value })}
            />
          </Field>
        </div>
        <p className="muted">Recalculates the original expense’s month.</p>
        <div className="form-footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy || remaining <= 0}>
            Save refund
          </button>
        </div>
      </form>
    </Dialog>
  );
}

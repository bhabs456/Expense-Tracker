"use client";
import { AmountInput } from "@/components/ui/AmountInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Primitives";
import { useWorkspace } from "@/components/layouts/WorkspaceProvider";
import { useMutation } from "@/hooks/useMutation";
import { todayInIndia, nextMonth } from "@/utils/format";
import type { Stipend, StipendInput } from "@/types/finance";
import { stipendService } from "../services/stipendService";
export function StipendEditor({
  stipend,
  onClose,
}: {
  stipend?: Stipend;
  onClose: () => void;
}) {
  const { catalog } = useWorkspace();
  const today = catalog?.today || todayInIndia();
  const { run, busy } = useMutation();
  const [dirty, setDirty] = useState(false);
  const [value, setValue] = useState<StipendInput>(
    stipend
      ? {
          earning_month: stipend.earning_month,
          expected_amount: stipend.expected_amount,
          received_amount:
            Number(stipend.received_amount) === 0
              ? ""
              : stipend.received_amount,
          received_date: stipend.received_date,
          confirmed: stipend.confirmed,
        }
      : {
          earning_month: today.slice(0, 7) + "-01",
          expected_amount: "",
          received_amount: "",
          received_date: null,
          confirmed: false,
        },
  );
  const change = <K extends keyof StipendInput>(key: K, v: StipendInput[K]) => {
    setValue({ ...value, [key]: v });
    setDirty(true);
  };
  return (
    <Dialog
      title={(stipend ? "Edit" : "Add") + " stipend"}
      onClose={onClose}
      dirty={dirty}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await run(() =>
              stipendService.save(
                {
                  ...value,
                  received_amount:
                    value.received_amount === "" ? 0 : value.received_amount,
                },
                stipend?.id,
              ),
            )
          )
            onClose();
        }}
      >
        <div className="form-grid">
          <Field label="Earning month">
            <DatePicker
              required
              mode="month"
              min="2026-10"
              value={value.earning_month.slice(0, 7)}
              onValueChange={(nextValue) =>
                change("earning_month", nextValue + "-01")
              }
            />
          </Field>
          <Field label="Expected amount (₹)">
            <AmountInput
              required

              placeholder="0"
              min="0"
              step="0.01"
              value={value.expected_amount}
              onValueChange={(nextValue) =>
                change("expected_amount", nextValue)
              }
            />
          </Field>
          <Field label="Actual received amount (₹)">
            <AmountInput
              required={value.confirmed}

              placeholder="0"
              min={value.confirmed ? "0.01" : "0"}
              step="0.01"
              value={value.received_amount}
              onValueChange={(nextValue) =>
                change("received_amount", nextValue)
              }
            />
          </Field>
          <Field label="Received date">
            <DatePicker
              required={value.confirmed}
              mode="date"
              max={today}
              value={value.received_date || ""}
              onValueChange={(nextValue) =>
                change("received_date", nextValue || null)
              }
            />
          </Field>
        </div>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={value.confirmed}
            onChange={(e) => change("confirmed", e.target.checked)}
          />{" "}
          I confirm this stipend has been received
        </label>
        <p className="muted">
          Funds the {nextMonth(value.earning_month)} budget, regardless of
          receipt date.
        </p>
        <div className="form-footer">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" disabled={busy}>
            Save stipend
          </button>
        </div>
      </form>
    </Dialog>
  );
}

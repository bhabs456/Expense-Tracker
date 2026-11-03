"use client";
import { AmountInput } from "@/components/ui/AmountInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field } from "@/components/ui/Primitives";
import { useWorkspace } from "@/components/layouts/WorkspaceProvider";
import { TRACKING_START } from "@/constants/finance";
import { todayInIndia } from "@/utils/format";
import type { ExpenseInput } from "@/types/finance";
export function ExpenseFields<T extends ExpenseInput>({
  value,
  onChange,
  credit = false,
}: {
  value: T;
  onChange: (v: T) => void;
  credit?: boolean;
}) {
  const { catalog } = useWorkspace();
  const categories = credit
    ? catalog?.savings_sources || []
    : Object.keys(catalog?.categories || {});
  const subcategories = catalog?.categories[value.category] || [];
  const change = (key: keyof ExpenseInput, v: string) =>
    onChange({
      ...value,
      [key]: v,
      ...(key === "category" ? { subcategory: "" } : {}),
    });
  return (
    <div className="form-grid">
      <Field label="Amount (₹)">
        <AmountInput
          required

          min="0.01"
          step="0.01"
          max="999999999999.99"
          value={value.amount}
          onValueChange={(nextValue) => change("amount", nextValue)}
          placeholder="0"
        />
      </Field>
      <Field label="Date">
        <DatePicker
          required
          mode="date"
          min={TRACKING_START}
          max={catalog?.today || todayInIndia()}
          value={value.date}
          onValueChange={(nextValue) => change("date", nextValue)}
        />
      </Field>
      <Field label={credit ? "Source" : "Category"}>
        <select
          value={value.category}
          onChange={(e) => change("category", e.target.value)}
        >
          {!categories.includes(value.category) && (
            <option value={value.category} disabled>
              {value.category} (historical)
            </option>
          )}
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      {!credit && (
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
              !subcategories.includes(value.subcategory) && (
                <option value={value.subcategory} disabled>
                  {value.subcategory} (review required)
                </option>
              )}
            {subcategories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      )}
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
      <Field label="Notes">
        <input
          maxLength={2000}
          value={value.notes}
          onChange={(e) => change("notes", e.target.value)}
          placeholder="What was it for?"
        />
      </Field>
    </div>
  );
}
export function expenseInput(value: ExpenseInput): ExpenseInput {
  return {
    amount: value.amount,
    date: value.date,
    category: value.category,
    subcategory: value.subcategory,
    payment_method: value.payment_method,
    notes: value.notes,
  };
}

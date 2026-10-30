"use client";
import { DatePicker } from "@/components/ui/DatePicker";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Field } from "@/components/ui/Primitives";
import { useWorkspace } from "@/components/layouts/WorkspaceProvider";
import { EMPTY_FILTERS, TRACKING_START } from "@/constants/finance";
import type { Filters } from "@/types/finance";
export function TransactionFilters({
  value,
  onChange,
  savings = false,
}: {
  value: Filters;
  onChange: (f: Filters) => void;
  savings?: boolean;
}) {
  const { catalog } = useWorkspace();
  const change = (key: keyof Filters, v: string) =>
    onChange({ ...value, [key]: v });
  return (
    <div className="filters">
      <label className="search">
        <Search size={17} />
        <input
          aria-label="Search transactions"
          placeholder="Search transactions…"
          value={value.search}
          onChange={(e) => change("search", e.target.value)}
        />
      </label>
      <Field label="From">
        <DatePicker
          mode="date"
          min={TRACKING_START}
          value={value.start}
          onValueChange={(nextValue) => change("start", nextValue)}
        />
      </Field>
      <Field label="To">
        <DatePicker
          mode="date"
          value={value.end}
          onValueChange={(nextValue) => change("end", nextValue)}
        />
      </Field>
      {savings && (
        <select
          aria-label="Transaction type"
          value={value.type}
          onChange={(e) => change("type", e.target.value)}
        >
          <option value="">All types</option>
          <option value="credit">Credit</option>
          <option value="debit">Debit</option>
        </select>
      )}
      <select
        aria-label="Filter category"
        value={value.category}
        onChange={(e) => change("category", e.target.value)}
      >
        <option value="">All categories</option>
        {Array.from(
          new Set([
            ...Object.keys(catalog?.categories || {}),
            ...(savings ? catalog?.savings_sources || [] : []),
          ]),
        ).map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <select
        aria-label="Filter payment method"
        value={value.payment_method}
        onChange={(e) => change("payment_method", e.target.value)}
      >
        <option value="">All payment methods</option>
        {catalog?.payment_methods.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>
      <button className="text-button" onClick={() => onChange(EMPTY_FILTERS)}>
        Clear
      </button>
    </div>
  );
}
export function Pagination({
  total,
  page,
  onChange,
}: {
  total: number;
  page: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="pagination">
      <span>{total} records · 20 per page</span>
      <div>
        <button disabled={page === 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft size={16} /> Previous
        </button>
        <span>Page {page}</span>
        <button
          disabled={page * 20 >= total}
          onClick={() => onChange(page + 1)}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

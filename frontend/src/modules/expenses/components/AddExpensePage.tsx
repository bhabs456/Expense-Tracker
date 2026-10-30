"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader, Loading } from "@/components/ui/Primitives";
import { ExpenseFields } from "@/components/shared/ExpenseFields";
import { useWorkspace } from "@/components/layouts/WorkspaceProvider";
import { useMutation } from "@/hooks/useMutation";
import { money } from "@/utils/format";
import type { BatchRow } from "@/types/finance";
import { expenseService } from "../services/expenseService";
export function AddExpensePage() {
  const { catalog, preferences, setDirty } = useWorkspace();
  const { run, busy } = useMutation();
  const [rows, setRows] = useState<BatchRow[]>([]);
  useEffect(() => () => setDirty(false), [setDirty]);
  useEffect(() => {
    if (catalog && preferences)
      setRows((prev) =>
        prev.length
          ? prev
          : [
              {
                amount: "",
                date: catalog.today,
                category: "Food & Drinks",
                subcategory: "",
                payment_method: preferences.default_payment_method,
                notes: "",
                savings_funded: false,
              },
            ],
      );
  }, [catalog, preferences]);
  if (!catalog || !preferences) return <Loading />;
  const create = (): BatchRow => ({
    amount: "",
    date: catalog.today,
    category: "Food & Drinks",
    subcategory: "",
    payment_method: preferences.default_payment_method,
    notes: "",
    savings_funded: false,
  });
  const change = (i: number, v: BatchRow) => {
    setRows(rows.map((r, j) => (i === j ? v : r)));
    setDirty(true);
  };
  return (
    <>
      <PageHeader
        title="Add Expense"
        description="Capture the small things. Keep the full picture."
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await run(
              (flags) => expenseService.batch(rows, flags),
              "All expenses saved",
            )
          ) {
            setRows([create()]);
            setDirty(false);
          }
        }}
      >
        <section className="panel batch-panel">
          <div className="panel-heading">
            <h2>A few details, all in one place</h2>
            <span>{rows.length} entries · saved together</span>
          </div>
          {rows.map((r, i) => (
            <div className="batch-row" key={i}>
              <div className="batch-heading">
                <h3>
                  <span>{String(i + 1).padStart(2, "0")}</span> Expense
                </h3>
                {rows.length > 1 && (
                  <button
                    type="button"
                    aria-label={"Remove expense " + (i + 1)}
                    onClick={() => {
                      setRows(rows.filter((_, j) => j !== i));
                      setDirty(true);
                    }}
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>
              <ExpenseFields value={r} onChange={(v) => change(i, v)} />
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={r.savings_funded}
                  onChange={(e) =>
                    change(i, { ...r, savings_funded: e.target.checked })
                  }
                />{" "}
                Paid from savings{" "}
                <small>Appears only in Savings Transactions</small>
              </label>
            </div>
          ))}
          <div className="form-footer">
            <button
              type="button"
              disabled={rows.length >= 100}
              onClick={() => {
                setRows([...rows, create()]);
                setDirty(true);
              }}
            >
              <Plus size={17} /> Add another
            </button>
            <div>
              <span>
                {rows.length} entries · total{" "}
                {money(rows.reduce((sum, r) => sum + Number(r.amount || 0), 0))}
              </span>
              <button
                className="primary"
                disabled={busy || catalog.today < catalog.tracking_start}
              >
                {busy ? "Saving…" : "Save all expenses"}
              </button>
            </div>
          </div>
        </section>
        <p className="footnote">
          All rows are validated together. If any entry needs attention, nothing
          is saved.
        </p>
      </form>
    </>
  );
}

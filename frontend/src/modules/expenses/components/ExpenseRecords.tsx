"use client";
import { Fragment, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Empty } from "@/components/ui/Primitives";
import { useMutation } from "@/hooks/useMutation";
import { money } from "@/utils/format";
import type { Expense } from "@/types/finance";
import { expenseService } from "../services/expenseService";
import { ExpenseEditor, RefundEditor } from "./ExpenseEditor";
export function ExpenseRecords({ rows }: { rows: Expense[] }) {
  const [editor, setEditor] = useState<{
    expense: Expense;
    refund: boolean;
  } | null>(null);
  const { run, busy } = useMutation();
  if (!rows.length) return <Empty />;
  return (
    <>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Date / details</th>
              <th>Category</th>
              <th>Payment</th>
              <th>Original</th>
              <th>Refunded</th>
              <th>Net</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.id}>
                <tr>
                  <td>
                    <b>{r.date}</b>
                    <small>
                      {r.notes || "—"}
                      {r.subscription_id ? " · Subscription" : ""}
                    </small>
                  </td>
                  <td>
                    {r.category}
                    <small>{r.subcategory}</small>
                  </td>
                  <td>{r.payment_method}</td>
                  <td>{money(r.amount)}</td>
                  <td>{money(r.refunded_amount)}</td>
                  <td>
                    <b>{money(r.net_amount)}</b>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        aria-label="Edit expense"
                        onClick={() => setEditor({ expense: r, refund: false })}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="text-button"
                        disabled={Number(r.net_amount) <= 0}
                        onClick={() => setEditor({ expense: r, refund: true })}
                      >
                        Refund
                      </button>
                      <button
                        aria-label="Delete expense"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete this expense and all ${r.refunds.length} linked refunds? Historical savings will be recalculated.`,
                            )
                          )
                            run(
                              () => expenseService.remove(r.id),
                              "Expense deleted",
                            );
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
                {r.refunds.map((refund) => (
                  <tr className="refund-row" key={"r" + refund.id}>
                    <td colSpan={6}>
                      Refund · {refund.date} · {money(refund.amount)} ·{" "}
                      {refund.notes}
                    </td>
                    <td>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Remove this refund and recalculate historical spending?",
                            )
                          )
                            run(
                              () => expenseService.removeRefund(refund.id),
                              "Refund removed",
                            );
                        }}
                      >
                        Remove refund
                      </button>
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {editor &&
        (editor.refund ? (
          <RefundEditor
            expense={editor.expense}
            onClose={() => setEditor(null)}
          />
        ) : (
          <ExpenseEditor
            expense={editor.expense}
            onClose={() => setEditor(null)}
          />
        ))}
    </>
  );
}

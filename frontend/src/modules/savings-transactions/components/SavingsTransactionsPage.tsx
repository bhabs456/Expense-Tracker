"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  PageHeader,
  Loading,
  ErrorState,
  Empty,
} from "@/components/ui/Primitives";
import {
  TransactionFilters,
  Pagination,
} from "@/components/shared/TransactionFilters";
import { useResource } from "@/hooks/useResource";
import { useMutation } from "@/hooks/useMutation";
import { money } from "@/utils/format";
import { EMPTY_FILTERS } from "@/constants/finance";
import type { SavingsTransaction } from "@/types/finance";
import { ledgerService } from "../services/ledgerService";
import { LedgerEditor } from "./LedgerEditor";
export function SavingsTransactionsPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS),
    [page, setPage] = useState(1),
    [editor, setEditor] = useState<SavingsTransaction | "new" | null>(null);
  const { data, loading, error, reload } = useResource(
    () => ledgerService.list(filters, page),
    JSON.stringify({ filters, page }),
  );
  const { run, busy } = useMutation();
  return (
    <>
      <PageHeader
        title="Savings Transactions"
        description="A separate home for your savings activity."
      >
        <button className="primary" onClick={() => setEditor("new")}>
          <Plus size={17} /> Add transaction
        </button>
      </PageHeader>
      <section className="panel">
        <TransactionFilters
          value={filters}
          onChange={(f) => {
            setFilters(f);
            setPage(1);
          }}
          savings
        />
        {error ? (
          <ErrorState message={error} retry={reload} />
        ) : loading ? (
          <Loading />
        ) : (
          <>
            {data?.items.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Date / details</th>
                      <th>Category / source</th>
                      <th>Payment</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Balance after</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <b>{r.date}</b>
                          <small>{r.notes || "—"}</small>
                        </td>
                        <td>
                          {r.category}
                          <small>{r.subcategory}</small>
                        </td>
                        <td>{r.payment_method}</td>
                        <td>
                          <span
                            className={
                              "pill " + (r.type === "credit" ? "positive" : "")
                            }
                          >
                            {r.type}
                          </span>
                        </td>
                        <td className={r.type === "credit" ? "positive" : ""}>
                          {r.type === "credit" ? "+" : "−"}
                          {money(r.amount)}
                        </td>
                        <td
                          className={
                            Number(r.running_balance) < 0 ? "negative" : ""
                          }
                        >
                          {money(r.running_balance)}
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              aria-label="Edit savings transaction"
                              onClick={() => setEditor(r)}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              aria-label="Delete savings transaction"
                              disabled={busy}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    "Delete this savings transaction? All later balances will be recalculated.",
                                  )
                                )
                                  run(
                                    (flags) =>
                                      ledgerService.remove(r.id, flags),
                                    "Transaction deleted",
                                  );
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty />
            )}
            <Pagination
              total={data?.total || 0}
              page={page}
              onChange={setPage}
            />
          </>
        )}
      </section>
      {editor && (
        <LedgerEditor
          transaction={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}

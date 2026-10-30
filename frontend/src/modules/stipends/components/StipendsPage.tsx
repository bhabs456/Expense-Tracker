"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  PageHeader,
  Loading,
  ErrorState,
  Empty,
} from "@/components/ui/Primitives";
import { useResource } from "@/hooks/useResource";
import { useMutation } from "@/hooks/useMutation";
import { money, nextMonth } from "@/utils/format";
import type { Stipend } from "@/types/finance";
import { stipendService } from "../services/stipendService";
import { StipendEditor } from "./StipendEditor";
export function StipendsPage() {
  const { data, loading, error, reload } = useResource(stipendService.list);
  const { run, busy } = useMutation();
  const [editor, setEditor] = useState<Stipend | "new" | null>(null);
  return (
    <>
      <PageHeader
        title="Stipends"
        description="This month’s earnings fund next month’s budget."
      >
        <button className="primary" onClick={() => setEditor("new")}>
          <Plus size={17} /> Add stipend
        </button>
      </PageHeader>
      <section className="panel">
        <div className="panel-heading">
          <h2>Monthly stipend records</h2>
          <span>Only confirmed receipts fund budgets</span>
        </div>
        {error ? (
          <ErrorState message={error} retry={reload} />
        ) : loading ? (
          <Loading />
        ) : data?.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Earning month</th>
                  <th>Funds month</th>
                  <th>Expected</th>
                  <th>Received</th>
                  <th>Received date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id}>
                    <td>{r.earning_month.slice(0, 7)}</td>
                    <td>{nextMonth(r.earning_month)}</td>
                    <td>{money(r.expected_amount)}</td>
                    <td>{money(r.received_amount)}</td>
                    <td>{r.received_date || "—"}</td>
                    <td>
                      <span
                        className={"pill " + (r.confirmed ? "positive" : "")}
                      >
                        {r.confirmed ? "Confirmed" : "Pending"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          aria-label="Edit stipend"
                          onClick={() => setEditor(r)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          disabled={busy}
                          aria-label="Delete stipend"
                          onClick={() => {
                            if (
                              window.confirm(
                                "Delete this stipend? Historical budgets and savings will be recalculated.",
                              )
                            )
                              run(
                                () => stipendService.remove(r.id),
                                "Stipend deleted",
                              );
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty text="Add your October 2026 stipend to fund November’s budget." />
        )}
      </section>
      {editor && (
        <StipendEditor
          stipend={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  );
}

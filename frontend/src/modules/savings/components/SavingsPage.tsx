"use client";
import { Alert } from "@/components/ui/Alert";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  PageHeader,
  Loading,
  ErrorState,
  StatCard,
  Empty,
} from "@/components/ui/Primitives";
import { useResource } from "@/hooks/useResource";
import { money } from "@/utils/format";
import { savingsService } from "../services/savingsService";
export function SavingsPage() {
  const { data, loading, error, reload } = useResource(savingsService.summary);
  return (
    <>
      <PageHeader
        title="Savings"
        description="Small decisions. A stronger tomorrow."
      />
      {error ? (
        <ErrorState message={error} retry={reload} />
      ) : loading || !data ? (
        <Loading />
      ) : (
        <>
          <div className="stats three">
            <StatCard
              title="Accumulated savings"
              value={data.accumulated}
              accent
              hint="Completed monthly savings + net savings ledger"
            />
            <StatCard
              title="Current month projection"
              value={data.projected}
              hint="Excluded from accumulated savings"
            />
            <div className="stat">
              <p>Your savings goals</p>
              <strong>
                {data.settings.minimum_savings_percent}%{" "}
                <span className="muted">
                  / {data.settings.stretch_savings_percent}%
                </span>
              </strong>
              <small>
                Minimum / stretch · <Link href="/settings">Adjust goals</Link>
              </small>
            </div>
          </div>
          {Number(data.accumulated) < 0 && (
            <Alert variant="warning">
              Your accumulated savings balance is negative.
            </Alert>
          )}
          <section className="panel">
            <div className="panel-heading">
              <h2>Completed monthly savings</h2>
              <Link href="/savings-transactions">
                Open savings ledger <ArrowUpRight size={15} />
              </Link>
            </div>
            {data.history.length ? (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Confirmed budget</th>
                      <th>Net regular spending</th>
                      <th>Monthly savings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.history].reverse().map((r) => (
                      <tr key={r.month}>
                        <td>{r.month}</td>
                        <td>{money(r.budget)}</td>
                        <td>{money(r.spending)}</td>
                        <td
                          className={
                            Number(r.savings) < 0 ? "negative" : "positive"
                          }
                        >
                          <b>{money(r.savings)}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty text="November’s savings will be included automatically on 1 December 2026." />
            )}
          </section>
        </>
      )}
    </>
  );
}

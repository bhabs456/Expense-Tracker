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
        description="Your savings balance, separate from your monthly budget."
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
              hint="Available now · excludes this month’s projection"
            />
            <StatCard
              title="Current month projection"
              value={data.projected}
              hint="Budget − regular spending · added after month-end"
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
            <h2>How your savings grow</h2>
            <p className="muted">
              Your savings aim is a target, not an upfront deduction. At
              month-end, the entire budget left after regular spending becomes
              savings, including anything above your aim. It is counted once and
              never added to next month’s spending budget.
            </p>
            <p>
              This month’s projected {money(data.projected)} becomes available
              on{" "}
              <b>
                {new Date(
                  data.current_month.savings_available_on + "T00:00:00",
                ).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </b>
              . Until then, it can change as you record expenses.
            </p>
            <dl className="savings-breakdown">
              <div>
                <dt>Completed-month savings</dt>
                <dd>{money(data.completed_month_savings)}</dd>
              </div>
              <div>
                <dt>Direct savings credits</dt>
                <dd>+ {money(data.ledger_credits)}</dd>
              </div>
              <div>
                <dt>Savings-funded purchases</dt>
                <dd>− {money(data.ledger_debits)}</dd>
              </div>
              <div>
                <dt>Available savings balance</dt>
                <dd>{money(data.accumulated)}</dd>
              </div>
            </dl>
            <p className="muted">
              Purchases paid from savings reduce this balance only. Regular
              spending and the monthly budget stay separate. Historical changes
              and refunds recalculate the affected month automatically.
            </p>
          </section>
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
              <Empty text="Completed months will appear here after month-end. This month’s leftover is still a projection." />
            )}
          </section>
        </>
      )}
    </>
  );
}

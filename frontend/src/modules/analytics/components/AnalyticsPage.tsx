"use client";
import { useState } from "react";
import {
  PageHeader,
  Loading,
  ErrorState,
  StatCard,
  Empty,
} from "@/components/ui/Primitives";
import { MonthPicker } from "@/components/shared/MonthPicker";
import {
  CategoryChart,
  MonthlyBars,
  WeeklyBars,
} from "@/components/shared/Charts";
import { useResource } from "@/hooks/useResource";
import { defaultMonth, money, weekLabel } from "@/utils/format";
import { useWorkspace } from "@/components/layouts/WorkspaceProvider";
import { analyticsService } from "../services/analyticsService";
export function AnalyticsPage() {
  const { catalog } = useWorkspace();
  const [month, setMonth] = useState(defaultMonth);
  const { data, loading, error, reload } = useResource(
    () => analyticsService.get(month),
    month,
  );
  return (
    <>
      <PageHeader
        title="Analytics"
        description="Understand where your money goes."
      >
        <MonthPicker value={month} onChange={setMonth} />
      </PageHeader>
      {error ? (
        <ErrorState message={error} retry={reload} />
      ) : loading || !data ? (
        <Loading />
      ) : (
        <>
          <div className="stats three">
            <StatCard
              title="Selected month spending"
              value={data.selected.spending}
            />
            <StatCard
              title="Selected month budget"
              value={data.selected.budget}
            />
            <StatCard
              title="Selected month savings"
              value={data.selected.savings}
              hint={
                month >= (catalog?.today || "").slice(0, 7)
                  ? "Projected · month still in progress"
                  : "Completed month · full budget leftover"
              }
            />
          </div>
          <section className="panel">
            <div className="panel-heading">
              <h2>Category breakdown</h2>
              <span>{month}</span>
            </div>
            <CategoryChart rows={data.selected.categories} />
          </section>
          <section className="panel" aria-labelledby="weekly-analysis-title">
            <div className="panel-heading">
              <h2 id="weekly-analysis-title">Weekly spending</h2>
              <span>Mon–Sun</span>
            </div>
            <p className="muted">
              Regular expenses after refunds. Weeks that cross a month boundary
              include both months’ days.
            </p>
            {data.weeks.length ? (
              <>
                <WeeklyBars rows={data.weeks} />
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.weeks.map((week) => (
                    <li
                      key={week.start}
                      className="flex flex-wrap justify-between gap-x-3 gap-y-1 rounded-xl border border-[var(--line)] px-3 py-2"
                    >
                      <span>{weekLabel(week.start, week.end)}</span>
                      <strong>{money(week.spending)}</strong>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <Empty text="Weekly totals will appear when tracking begins." />
            )}
          </section>
          <div className="dashboard-grid equal">
            <section className="panel">
              <h2>Monthly spending</h2>
              <MonthlyBars rows={data.months} metric="spending" />
            </section>
            <section className="panel">
              <h2>Monthly savings</h2>
              <p className="muted">
                Current month is projected; completed months count toward
                savings. Goals are not deducted.
              </p>
              <MonthlyBars rows={data.months} metric="savings" />
            </section>
          </div>
        </>
      )}
    </>
  );
}

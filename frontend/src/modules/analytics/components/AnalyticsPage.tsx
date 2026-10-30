"use client";
import { useState } from "react";
import {
  PageHeader,
  Loading,
  ErrorState,
  StatCard,
} from "@/components/ui/Primitives";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { CategoryChart, MonthlyBars } from "@/components/shared/Charts";
import { useResource } from "@/hooks/useResource";
import { defaultMonth, todayInIndia } from "@/utils/format";
import { analyticsService } from "../services/analyticsService";
export function AnalyticsPage() {
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
                month === todayInIndia().slice(0, 7)
                  ? "Projected · month still in progress"
                  : "Budget less net regular spending"
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
          <div className="dashboard-grid equal">
            <section className="panel">
              <h2>Monthly spending</h2>
              <MonthlyBars rows={data.months} metric="spending" />
            </section>
            <section className="panel">
              <h2>Monthly savings</h2>
              <p className="muted">Current month is projected.</p>
              <MonthlyBars rows={data.months} metric="savings" />
            </section>
          </div>
        </>
      )}
    </>
  );
}

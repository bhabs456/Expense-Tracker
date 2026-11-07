"use client";
import { Alert } from "@/components/ui/Alert";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useState } from "react";
import Link from "next/link";
import { Plus, PiggyBank, ArrowUpRight, CalendarRange } from "lucide-react";
import {
  PageHeader,
  StatCard,
  Loading,
  ErrorState,
} from "@/components/ui/Primitives";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { CategoryChart } from "@/components/shared/Charts";
import { ExpenseRecords } from "@/modules/expenses";
import { useResource } from "@/hooks/useResource";
import { defaultMonth, money, weekLabel } from "@/utils/format";
import { useWorkspace } from "@/components/layouts/WorkspaceProvider";
import { dashboardService } from "../services/dashboardService";
export function DashboardPage() {
  const { catalog } = useWorkspace();
  const [month, setMonth] = useState(defaultMonth);
  const {
    data: d,
    loading,
    error,
    reload,
  } = useResource(() => dashboardService.get(month), month);
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Your money. Your moves. Make room for the good stuff."
      >
        <MonthPicker value={month} onChange={setMonth} />
        <Link className="primary button-link" href="/add-expense">
          <Plus size={17} /> Add expense
        </Link>
      </PageHeader>
      {error ? (
        <ErrorState message={error} retry={reload} />
      ) : loading || !d ? (
        <Loading />
      ) : (
        <>
          <div className="stats">
            <StatCard
              title="Monthly budget"
              value={d.budget}
              hint={
                d.stipend_pending
                  ? "Stipend Pending"
                  : "From the previous earning month"
              }
            />
            <StatCard
              title="Net spending"
              value={d.spending}
              hint={`${Number(d.usage_percent).toFixed(0)}% of budget used`}
            />
            <StatCard
              title="Remaining budget"
              value={d.remaining}
              accent
              hint="Regular spending only · savings is separate"
            />
            <StatCard
              title="Today’s spending"
              value={d.today_spending}
              hint="Regular expenses only"
            />
          </div>
          {Number(d.usage_percent) >= 80 && (
            <Alert variant="warning">
              {Number(d.usage_percent) >= 100
                ? "You’ve reached or exceeded your monthly budget."
                : "You’ve used at least 80% of your monthly budget."}{" "}
              You can continue recording expenses.
            </Alert>
          )}
          <section className="panel" aria-labelledby="weekly-spending-title">
            <div className="panel-heading flex-wrap">
              <h2
                id="weekly-spending-title"
                className="flex items-center gap-2"
              >
                <CalendarRange size={20} aria-hidden="true" /> Weekly spending
              </h2>
              <strong className="text-xl">{money(d.week.spending)}</strong>
            </div>
            <p className="muted">
              {weekLabel(d.week.start, d.week.end)} · Mon–Sat · Regular expenses
              after refunds
            </p>
          </section>
          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-heading">
                <h2>The spending mix</h2>
                <span>Net category spending</span>
              </div>
              <CategoryChart rows={d.categories} />
            </section>
            <section className="panel savings-panel">
              <div className="panel-heading">
                <h2>Big dreams, little steps</h2>
                <PiggyBank size={22} />
              </div>
              <p>Accumulated savings</p>
              <strong
                className={Number(d.accumulated_savings) < 0 ? "negative" : ""}
              >
                {money(d.accumulated_savings)}
              </strong>
              <small>
                Completed months + savings credits − savings purchases
              </small>
              <div className="goal">
                <span>
                  {month < (catalog?.today || "").slice(0, 7)
                    ? "Selected month’s completed savings"
                    : "Selected month’s projected savings"}
                </span>
                <b>{money(d.remaining)}</b>
              </div>
              <ProgressBar
                label="Selected month stretch savings goal progress"
                value={
                  (Number(d.remaining) / Math.max(1, Number(d.stretch_goal))) *
                  100
                }
              />
              <small>
                Goals are targets, not deductions. The full leftover joins
                savings after month-end, counted once.
              </small>
              <div className="goals">
                <span>
                  Minimum <b>{money(d.minimum_goal)}</b>
                </span>
                <span>
                  Stretch <b>{money(d.stretch_goal)}</b>
                </span>
              </div>
              <Link href="/savings">
                View savings <ArrowUpRight size={15} />
              </Link>
            </section>
          </div>
          <section className="panel">
            <div className="panel-heading">
              <h2>Recent expenses</h2>
              <Link href="/history">
                View all <ArrowUpRight size={15} />
              </Link>
            </div>
            <ExpenseRecords rows={d.recent} />
          </section>
        </>
      )}
    </>
  );
}

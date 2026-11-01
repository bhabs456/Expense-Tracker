"use client";
import { useState } from "react";
import { PageHeader, Loading, ErrorState } from "@/components/ui/Primitives";
import { MonthPicker } from "@/components/shared/MonthPicker";
import { ExpenseRecords } from "@/modules/expenses";
import { useResource } from "@/hooks/useResource";
import { defaultMonth, money } from "@/utils/format";
import { calendarService } from "../services/calendarService";
export function CalendarPage() {
  const [month, setMonth] = useState(defaultMonth),
    [selected, setSelected] = useState("");
  const { data, loading, error, reload } = useResource(
    () => calendarService.get(month),
    month,
  );
  const [y, m] = month.split("-").map(Number);
  const offset = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const count = new Date(y, m, 0).getDate();
  return (
    <>
      <PageHeader
        title="Calendar"
        description="Your spending, one day at a time."
      >
        <MonthPicker
          allowFuture
          value={month}
          onChange={(v) => {
            setMonth(v);
            setSelected("");
          }}
        />
      </PageHeader>
      {error ? (
        <ErrorState message={error} retry={reload} />
      ) : loading || !data ? (
        <Loading />
      ) : (
        <>
          <section className="panel">
            <p className="muted">
              Browse months from November 2026 onward. Future dates can be
              viewed; expenses can only be recorded up to today.
            </p>
            <div className="panel-heading">
              <h2>
                {new Date(y, m - 1, 1).toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <span>Regular net spending</span>
            </div>
            <div className="calendar-grid">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div className="weekday" key={d}>
                  {d}
                </div>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <div className="calendar-blank" key={"b" + i} />
              ))}
              {Array.from({ length: count }, (_, i) => {
                const d = month + "-" + String(i + 1).padStart(2, "0");
                const total = data.days.find((r) => r.date === d)?.total;
                return (
                  <button
                    className={
                      "calendar-day " + (selected === d ? "selected" : "")
                    }
                    key={d}
                    onClick={() => setSelected(d)}
                  >
                    <span>{i + 1}</span>
                    {total !== undefined && <b>{money(total)}</b>}
                  </button>
                );
              })}
            </div>
          </section>
          {selected && (
            <section className="panel">
              <div className="panel-heading">
                <h2>{selected}</h2>
                <span>
                  Total{" "}
                  {money(
                    data.days.find((d) => d.date === selected)?.total || 0,
                  )}
                </span>
              </div>
              <ExpenseRecords
                rows={data.items.filter((r) => r.date === selected)}
              />
            </section>
          )}
        </>
      )}
    </>
  );
}

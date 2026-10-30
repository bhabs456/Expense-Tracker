"use client";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { CHART_COLORS } from "@/constants/finance";
import { money } from "@/utils/format";
import { Empty } from "@/components/ui/Primitives";
import type { CategoryTotal, MonthlySummary } from "@/types/finance";
export function CategoryChart({ rows }: { rows: CategoryTotal[] }) {
  const reducedMotion = useReducedMotion();
  return rows.some((r) => Number(r.value) > 0) ? (
    <div className="chart-pair">
      <div className="donut">
        <ResponsiveContainer width="100%" height={230}>
          <PieChart>
            <Pie
              data={rows.map((r) => ({ ...r, value: Number(r.value) }))}
              dataKey="value"
              nameKey="name"
              innerRadius={68}
              outerRadius={96}
              paddingAngle={3}
              stroke="none"
              isAnimationActive={!reducedMotion}
              animationDuration={550}
            >
              {rows.map((r, i) => (
                <Cell
                  key={r.name}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => money(Number(v))}
              contentStyle={{
                background: "var(--panel)",
                color: "var(--ink)",
                border: "1px solid var(--line)",
                borderRadius: 12,
                boxShadow: "var(--shadow)",
              }}
              itemStyle={{ color: "var(--ink)" }}
              labelStyle={{ color: "var(--muted)" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="legend">
        {rows.map((r, i) => (
          <div key={r.name}>
            <i style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span>{r.name}</span>
            <b>{money(r.value)}</b>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <Empty text="Your category breakdown will appear after your first expense." />
  );
}
export function MonthlyBars({
  rows,
  metric,
}: {
  rows: MonthlySummary[];
  metric: "spending" | "savings";
}) {
  const reducedMotion = useReducedMotion();
  return rows.length ? (
    <div className="bar-chart">
      <ResponsiveContainer width="100%" height={270}>
        <BarChart
          data={rows.map((r) => ({ ...r, [metric]: Number(r[metric]) }))}
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="var(--line)"
          />
          <XAxis
            dataKey="month"
            tick={{ fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v) =>
              Number(v) >= 1000 ? `${Number(v) / 1000}k` : String(v)
            }
            tick={{ fill: "var(--muted)" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(v) => money(Number(v))}
            contentStyle={{
              background: "var(--panel)",
              color: "var(--ink)",
              border: "1px solid var(--line)",
              borderRadius: 12,
              boxShadow: "var(--shadow)",
            }}
            itemStyle={{ color: "var(--ink)" }}
            labelStyle={{ color: "var(--muted)" }}
          />
          <Bar
            dataKey={metric}
            fill="var(--accent)"
            isAnimationActive={!reducedMotion}
            animationDuration={550}
            radius={[5, 5, 0, 0]}
            maxBarSize={42}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <Empty text="Completed months will appear here automatically." />
  );
}

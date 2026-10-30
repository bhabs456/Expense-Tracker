import { Alert } from "@/components/ui/Alert";
import type { ReactNode } from "react";
import {
  ReceiptText,
  Sparkles,
  Coins,
  Wallet,
  ShoppingBag,
  PiggyBank,
  Sun,
  LayoutDashboard,
  Plus,
  CalendarDays,
  ChartNoAxesCombined,
  ArrowLeftRight,
  Repeat,
  Settings,
  type LucideIcon,
} from "lucide-react";
const pageIcons: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  "Add Expense": Plus,
  Calendar: CalendarDays,
  Analytics: ChartNoAxesCombined,
  Savings: PiggyBank,
  "Savings Transactions": ArrowLeftRight,
  Subscriptions: Repeat,
  Stipends: Wallet,
  "Expense History": ReceiptText,
  Settings,
};
function statIcon(title: string): LucideIcon {
  if (title.toLowerCase().includes("spending")) return ShoppingBag;
  if (
    title.toLowerCase().includes("savings") ||
    title.toLowerCase().includes("projection")
  )
    return PiggyBank;
  if (title.toLowerCase().includes("today")) return Sun;
  return Wallet;
}
import { money } from "@/utils/format";
import type { Money } from "@/types/finance";
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field flex min-w-0 flex-col gap-2">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function StatCard({
  title,
  value,
  hint,
  accent = false,
}: {
  title: string;
  value: Money;
  hint?: string;
  accent?: boolean;
}) {
  const Icon = statIcon(title);
  return (
    <div className={"stat " + (accent ? "accent" : "")}>
      <div className="stat-top">
        <p>{title}</p>
        <span className="stat-symbol" aria-hidden="true">
          <Icon size={19} />
        </span>
      </div>
      <strong>{money(value)}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}
export function Empty({
  text = "No transactions yet. Your records will appear here.",
}: {
  text?: string;
}) {
  return (
    <div className="empty">
      <div className="empty-art" aria-hidden="true">
        <span className="empty-orbit orbit-one">
          <Coins size={17} />
        </span>
        <span className="empty-main">
          <ReceiptText size={30} />
        </span>
        <span className="empty-orbit orbit-two">
          <Sparkles size={16} />
        </span>
      </div>
      <p>{text}</p>
    </div>
  );
}
export function Loading() {
  return (
    <div className="loading" role="status">
      Loading your workspace…
    </div>
  );
}
export function ErrorState({
  message,
  retry,
  retryLabel = "Try again",
}: {
  message: string;
  retry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div>
      <Alert variant="error" resetKey={message}>
        {message}
      </Alert>
      {retry && (
        <button className="retry-button" onClick={retry}>
          {retryLabel}
        </button>
      )}
    </div>
  );
}
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  const Icon = pageIcons[title] || Sparkles;
  return (
    <header
      data-page={title}
      className="page-header flex items-center justify-between gap-5"
    >
      <div className="header-copy">
        <span className="page-mark" aria-hidden="true">
          <Icon size={28} />
        </span>
        <div>
          <p className="eyebrow">
            <Sparkles size={11} aria-hidden="true" /> SMALL SPENDS. BIG
            POSSIBILITIES.
          </p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
      <div className="header-actions">{children}</div>
    </header>
  );
}

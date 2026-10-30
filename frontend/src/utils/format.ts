import type { Money } from "@/types/finance";
export const money = (value: Money = 0) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value));
export const todayInIndia = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const defaultMonth = () =>
  todayInIndia().slice(0, 7) < "2026-11"
    ? "2026-11"
    : todayInIndia().slice(0, 7);
export function nextMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return `${year + Math.floor(month / 12)}-${String((month % 12) + 1).padStart(2, "0")}`;
}
export function query(values: object) {
  return new URLSearchParams(
    Object.entries(values)
      .filter(([, v]) => v !== "" && v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
}

export function afterDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

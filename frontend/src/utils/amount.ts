/** Formatting never passes through floating point, preserving decimal input exactly. */
export function rawAmount(value: string) {
  return value.replace(/[,\s₹]/g, "");
}
export function formatIndianAmount(value: string | number) {
  const raw = String(value);
  if (!raw) return "";
  const [integer, fraction] = raw.split(".");
  const normalized = (integer || "0").replace(/^0+(?=\d)/, "");
  const last = normalized.slice(-3),
    head = normalized.slice(0, -3);
  const grouped = head
    ? head.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last
    : last;
  return grouped + (fraction !== undefined ? "." + fraction : "");
}
export function amountError(
  raw: string,
  min?: string | number,
  max?: string | number,
) {
  if (!raw) return "";
  if (!/^\d+(?:\.\d{0,2})?$/.test(raw))
    return "Enter a valid amount with at most two decimal places.";
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return "Enter a valid amount.";
  if (min !== undefined && amount < Number(min))
    return `Enter at least ${formatIndianAmount(min)}.`;
  if (max !== undefined && amount > Number(max))
    return `Enter no more than ${formatIndianAmount(max)}.`;
  return "";
}

import type { Expense } from "@/types/finance";
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly candidates: Expense[];
  constructor(detail: unknown, status: number) {
    const obj =
      typeof detail === "object" && detail !== null
        ? (detail as Record<string, unknown>)
        : {};
    const validation = Array.isArray(detail)
      ? detail
          .map(
            (v: Record<string, unknown>) =>
              `${Array.isArray(v.loc) ? v.loc.slice(1).join(".") : "Input"}: ${v.msg}`,
          )
          .join("; ")
      : undefined;
    super(
      typeof detail === "string"
        ? detail
        : validation || String(obj.message || "Request failed"),
    );
    this.status = status;
    this.code = typeof obj.code === "string" ? obj.code : undefined;
    this.candidates = Array.isArray(obj.candidates)
      ? (obj.candidates as Expense[])
      : [];
  }
}
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch("/api/v1" + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    throw new ApiError(
      response.ok
        ? "The local server returned an unexpected response. Please retry."
        : "The local server could not complete this request. Please retry.",
      response.status,
    );
  }

  if (!response.ok)
    throw new ApiError(
      typeof data === "object" && data !== null && "detail" in data
        ? data.detail
        : "Request failed",
      response.status,
    );
  return data as T;
}
export const downloadBackup = async () => {
  const response = await fetch("/api/v1/backups", { method: "POST" });
  if (!response.ok) throw new Error("Backup failed");
  const blob = await response.blob();
  const name =
    response.headers
      .get("Content-Disposition")
      ?.match(/filename="(.+)"/)?.[1] || "expense-tracker-backup.json";
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
};

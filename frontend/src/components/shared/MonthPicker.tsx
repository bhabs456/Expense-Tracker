"use client";
import { DatePicker } from "@/components/ui/DatePicker";
import { useWorkspace } from "@/components/layouts/WorkspaceProvider";
export function MonthPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { catalog } = useWorkspace();
  return (
    <DatePicker
      aria-label="Select month"
      mode="month"
      required
      min="2026-11"
      max={
        (catalog?.today || "2026-11").slice(0, 7) < "2026-11"
          ? "2026-11"
          : catalog?.today.slice(0, 7)
      }
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue) onChange(nextValue);
      }}
    />
  );
}

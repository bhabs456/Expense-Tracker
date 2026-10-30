"use client";
import { useEffect, useState } from "react";
/** One short transition on entry or value change; no animation loop. */
export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  const percent = Math.min(
    100,
    Math.max(0, Number.isFinite(value) ? value : 0),
  );
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(percent)}
    >
      <i
        className="transition-[width] duration-700 ease-out motion-reduce:transition-none"
        style={{ width: `${entered ? percent : 0}%` }}
      />
    </div>
  );
}

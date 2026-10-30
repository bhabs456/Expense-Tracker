"use client";
import {
  useLayoutEffect,
  useId,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { todayInIndia } from "@/utils/format";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "min" | "max"
> & {
  mode?: "date" | "month";
  value: string;
  min?: string;
  max?: string;
  onValueChange: (value: string) => void;
};
const monthNames = Array.from({ length: 12 }, (_, i) =>
  new Date(2026, i, 1).toLocaleDateString("en-IN", { month: "long" }),
);
const monthKey = (year: number, month: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}`;
function initialMonth(value: string, min?: string, max?: string) {
  let base = value || todayInIndia();
  if (min && base < min) base = min;
  if (max && base > max && (!min || min <= max)) base = max;
  const [year, month] = base.split("-").map(Number);
  return new Date(year || 2026, (month || 1) - 1, 1);
}
/** Native input semantics/validation with a lightweight, shared calendar surface. */
export function DatePicker({
  mode = "date",
  value,
  min,
  max,
  onValueChange,
  required,
  disabled,
  ...inputProps
}: Props) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false),
    [visible, setVisible] = useState(() => initialMonth(value, min, max));
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 300,
    maxHeight: 360,
  });
  const today = todayInIndia();
  const year = visible.getFullYear(),
    month = visible.getMonth();
  const emptyRange = !!(min && max && min > max);
  const allowed = (date: string) =>
    !emptyRange && (!min || date >= min) && (!max || date <= max);
  const monthAllowed = (key: string) =>
    !emptyRange &&
    (!min || key >= min.slice(0, 7)) &&
    (!max || key <= max.slice(0, 7));
  const show = () => {
    if (disabled) return;
    if (!open) setVisible(initialMonth(value, min, max));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
  };
  const select = (next: string) => {
    onValueChange(next);
    close();
    input.current?.focus();
  };
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = root.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(300, window.innerWidth - 24),
        height = Math.min(355, window.innerHeight - 24);
      const below = window.innerHeight - rect.bottom;
      const top =
        below >= height || below >= rect.top
          ? Math.min(rect.bottom + 6, window.innerHeight - height - 12)
          : Math.max(12, rect.top - height - 6);
      setPosition({
        top: Math.max(12, top),
        left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
        width,
        maxHeight: height,
      });
    };
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!root.current?.contains(target) && !popup.current?.contains(target))
        setOpen(false);
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("pointerdown", outside);
    };
  }, [open]);
  function calendarKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      input.current?.focus();
      return;
    }
    const active = document.activeElement as HTMLButtonElement | null;
    if (!active?.dataset.calendarValue) return;
    const buttons = Array.from(
      popup.current?.querySelectorAll<HTMLButtonElement>(
        "[data-calendar-value]:not(:disabled)",
      ) || [],
    );
    const index = buttons.indexOf(active);
    const columns = mode === "date" ? 7 : 3;
    const move: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columns,
      ArrowUp: -columns,
    };
    if (event.key in move) {
      event.preventDefault();
      buttons[
        Math.min(buttons.length - 1, Math.max(0, index + move[event.key]))
      ]?.focus();
    }
  }
  const step = (delta: number) =>
    setVisible(
      new Date(
        year + (mode === "month" ? delta : 0),
        month + (mode === "date" ? delta : 0),
        1,
      ),
    );
  const previous =
    mode === "date"
      ? monthKey(
          new Date(year, month - 1, 1).getFullYear(),
          new Date(year, month - 1, 1).getMonth(),
        )
      : `${year - 1}-12`;
  const next =
    mode === "date"
      ? monthKey(
          new Date(year, month + 1, 1).getFullYear(),
          new Date(year, month + 1, 1).getMonth(),
        )
      : `${year + 1}-01`;
  const currentYear = Number(today.slice(0, 4));
  const firstYear = min
    ? Number(min.slice(0, 4))
    : Math.min(year, currentYear) - 20;
  const lastYear = max
    ? Number(max.slice(0, 4))
    : Math.max(year, currentYear) + 20;
  const years = Array.from(
    { length: Math.max(1, lastYear - firstYear + 1) },
    (_, i) => firstYear + i,
  );
  // Bounds define selectable dates; the dropdown also includes the visible year for backdated inputs.
  const yearChoices = Array.from(new Set([...years, year])).sort(
    (a, b) => a - b,
  );
  const count = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  return (
    <div
      ref={root}
      className="date-picker-field"
      data-open={open}
      onClick={show}
    >
      <input
        {...inputProps}
        ref={input}
        type={mode}
        value={value}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-haspopup="dialog"
        onChange={(e) => onValueChange(e.target.value)}
        onClick={(e) => {
          e.preventDefault();
          show();
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && e.altKey) {
            e.preventDefault();
            show();
            requestAnimationFrame(() =>
              popup.current
                ?.querySelector<HTMLButtonElement>(
                  '[data-calendar-value][aria-pressed="true"]:not(:disabled), [data-calendar-value]:not(:disabled)',
                )
                ?.focus(),
            );
          }
          if (e.key === "Escape" && open) {
            e.preventDefault();
            e.stopPropagation();
            close();
          }
        }}
      />
      <CalendarDays className="date-picker-icon" size={17} aria-hidden="true" />
      {open &&
        createPortal(
          <div
            ref={popup}
            id={id}
            className="date-picker-popover"
            role="dialog"
            aria-label={mode === "month" ? "Choose month" : "Choose date"}
            style={position}
            onKeyDown={calendarKey}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="date-picker-heading">
              <span>
                <CalendarDays size={16} />
                {mode === "month" ? "Pick a month" : "Pick a date"}
              </span>
              <button type="button" aria-label="Close calendar" onClick={close}>
                <X size={16} />
              </button>
            </div>
            <div className="date-picker-navigation">
              <button
                type="button"
                aria-label={
                  mode === "date" ? "Previous month" : "Previous year"
                }
                disabled={emptyRange || !!(min && previous < min.slice(0, 7))}
                onClick={() => step(-1)}
              >
                <ChevronLeft size={17} />
              </button>
              <div>
                {mode === "date" && (
                  <select
                    aria-label="Calendar month"
                    value={month}
                    onChange={(e) =>
                      setVisible(new Date(year, Number(e.target.value), 1))
                    }
                  >
                    {monthNames.map((name, i) => (
                      <option key={name} value={i}>
                        {name}
                      </option>
                    ))}
                  </select>
                )}
                <select
                  aria-label="Calendar year"
                  value={year}
                  onChange={(e) =>
                    setVisible(new Date(Number(e.target.value), month, 1))
                  }
                >
                  {yearChoices.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                aria-label={mode === "date" ? "Next month" : "Next year"}
                disabled={emptyRange || !!(max && next > max.slice(0, 7))}
                onClick={() => step(1)}
              >
                <ChevronRight size={17} />
              </button>
            </div>
            {mode === "date" ? (
              <div className="date-picker-days">
                {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                  <span className="date-picker-weekday" key={d}>
                    {d}
                  </span>
                ))}
                {Array.from({ length: offset }, (_, i) => (
                  <span key={"blank" + i} />
                ))}
                {Array.from({ length: count }, (_, i) => {
                  const day =
                    monthKey(year, month) +
                    "-" +
                    String(i + 1).padStart(2, "0");
                  return (
                    <button
                      key={day}
                      type="button"
                      data-calendar-value={day}
                      aria-label={day}
                      aria-pressed={value === day}
                      aria-current={today === day ? "date" : undefined}
                      className={
                        value === day
                          ? "chosen"
                          : today === day
                            ? "is-today"
                            : ""
                      }
                      disabled={!allowed(day)}
                      onClick={() => select(day)}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="date-picker-months">
                {monthNames.map((name, i) => {
                  const key = monthKey(year, i);
                  return (
                    <button
                      key={key}
                      type="button"
                      data-calendar-value={key}
                      aria-label={`${name} ${year}`}
                      aria-pressed={value === key}
                      className={value === key ? "chosen" : ""}
                      disabled={!monthAllowed(key)}
                      onClick={() => select(key)}
                    >
                      {name.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            )}
            {emptyRange && (
              <p className="date-picker-help">
                No dates are available in this range yet.
              </p>
            )}
            <div className="date-picker-footer">
              <button
                type="button"
                disabled={
                  mode === "month"
                    ? !monthAllowed(today.slice(0, 7))
                    : !allowed(today)
                }
                onClick={() =>
                  select(mode === "month" ? today.slice(0, 7) : today)
                }
              >
                {mode === "month" ? "This month" : "Today"}
              </button>
              {!required && (
                <button type="button" onClick={() => select("")}>
                  Clear
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

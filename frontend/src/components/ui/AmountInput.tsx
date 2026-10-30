"use client";
import {
  useLayoutEffect,
  useRef,
  type InputHTMLAttributes,
  type KeyboardEvent,
} from "react";
import { rawAmount, formatIndianAmount, amountError } from "@/utils/amount";
import type { Money } from "@/types/finance";
type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "min" | "max"
> & {
  value: Money;
  onValueChange: (value: string) => void;
  min?: string | number;
  max?: string | number;
};
export function AmountInput({
  value,
  onValueChange,
  min,
  max,
  step: _step,
  ...props
}: Props) {
  const input = useRef<HTMLInputElement>(null),
    caret = useRef<number | null>(null);
  const raw = String(value),
    display = formatIndianAmount(raw);
  useLayoutEffect(() => {
    const el = input.current;
    if (!el) return;
    el.setCustomValidity(amountError(raw, min, max));
    if (caret.current !== null && document.activeElement === el) {
      let position = 0,
        count = 0;
      while (position < display.length && count < caret.current) {
        if (display[position] !== ",") count++;
        position++;
      }
      el.setSelectionRange(position, position);
      caret.current = null;
    }
  }, [raw, display, min, max]);
  function removeCommaAdjacent(event: KeyboardEvent<HTMLInputElement>) {
    const el = event.currentTarget,
      start = el.selectionStart ?? 0;
    if (start !== el.selectionEnd) return;
    const backward = event.key === "Backspace" && display[start - 1] === ",";
    const forward = event.key === "Delete" && display[start] === ",";
    if (!backward && !forward) return;
    event.preventDefault();
    const offset = rawAmount(display.slice(0, start)).length;
    const index = backward ? offset - 1 : offset;
    caret.current = index;
    onValueChange(raw.slice(0, index) + raw.slice(index + 1));
  }
  return (
    <input
      {...props}
      ref={input}
      type="text"
      inputMode="decimal"
      placeholder="0"
      value={display}
      onKeyDown={removeCommaAdjacent}
      onChange={(event) => {
        let next = rawAmount(event.target.value);
        if (!/^\d*(?:\.\d{0,2})?$/.test(next)) return;
        let offset = rawAmount(
          event.target.value.slice(0, event.target.selectionStart ?? 0),
        ).length;
        if (next.startsWith(".")) {
          next = "0" + next;
          offset++;
        }
        caret.current = offset;
        onValueChange(next);
      }}
    />
  );
}

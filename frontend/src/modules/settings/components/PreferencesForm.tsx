"use client";
import { AmountInput } from "@/components/ui/AmountInput";
import { useState, useEffect } from "react";
import { Field } from "@/components/ui/Primitives";
import { useWorkspace } from "@/components/layouts/WorkspaceProvider";
import { useMutation } from "@/hooks/useMutation";
import type { PreferencesInput, Theme } from "@/types/finance";
import { settingsService } from "../services/settingsService";
export function PreferencesForm() {
  const { catalog, preferences, setPreferences } = useWorkspace();
  const { run, busy } = useMutation();
  const [value, setValue] = useState<PreferencesInput | null>(null);
  useEffect(() => {
    if (preferences)
      setValue({
        minimum_savings_percent: preferences.minimum_savings_percent,
        stretch_savings_percent: preferences.stretch_savings_percent,
        default_payment_method: preferences.default_payment_method,
        theme: preferences.theme,
      });
  }, [preferences]);
  if (!value) return null;
  return (
    <section className="panel">
      <h2>Preferences</h2>
      <p className="muted">
        Goals guide your spending; they never restrict it.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const saved = await settingsService.save(value);
            setPreferences(saved);
            return saved;
          }, "Preferences saved");
        }}
      >
        <div className="form-grid">
          <Field label="Minimum savings goal (%)">
            <AmountInput
              required

              placeholder="0"
              min="0"
              max="100"
              step="0.01"
              value={value.minimum_savings_percent}
              onValueChange={(nextValue) =>
                setValue({ ...value, minimum_savings_percent: nextValue })
              }
            />
          </Field>
          <Field label="Stretch savings goal (%)">
            <AmountInput
              required

              placeholder="0"
              min={value.minimum_savings_percent}
              max="100"
              step="0.01"
              value={value.stretch_savings_percent}
              onValueChange={(nextValue) =>
                setValue({ ...value, stretch_savings_percent: nextValue })
              }
            />
          </Field>
          <Field label="Default payment method">
            <select
              value={value.default_payment_method}
              onChange={(e) =>
                setValue({ ...value, default_payment_method: e.target.value })
              }
            >
              {catalog?.payment_methods.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Theme">
            <select
              value={value.theme}
              onChange={(e) =>
                setValue({ ...value, theme: e.target.value as Theme })
              }
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">Use device setting</option>
            </select>
          </Field>
        </div>
        <div className="form-footer">
          <span>INR · Asia/Kolkata</span>
          <button className="primary" disabled={busy}>
            Save preferences
          </button>
        </div>
      </form>
    </section>
  );
}

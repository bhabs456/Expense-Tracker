"use client";
import { useState } from "react";
import { ApiError } from "@/services/api";
import { useWorkspace } from "@/components/layouts/WorkspaceProvider";
import type { Confirmation } from "@/types/finance";
export function useMutation() {
  const { notify, refresh } = useWorkspace();
  const [busy, setBusy] = useState(false);
  async function run<T>(
    operation: (confirmation: Confirmation) => Promise<T>,
    message = "Saved successfully",
  ): Promise<T | null> {
    setBusy(true);
    const flags: Confirmation = {};
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await operation(flags);
          notify(message);
          refresh();
          return result;
        } catch (e) {
          if (
            e instanceof ApiError &&
            e.status === 409 &&
            (e.code === "duplicates" || e.code === "negative_savings")
          ) {
            if (!window.confirm(e.message)) return null;
            if (e.code === "duplicates") flags.confirm_duplicates = true;
            else flags.confirm_negative_savings = true;
          } else throw e;
        }
      }
      throw new Error("Could not complete the confirmation. Please try again.");
    } catch (e) {
      notify((e as Error).message, true);
      return null;
    } finally {
      setBusy(false);
    }
  }
  return { run, busy };
}

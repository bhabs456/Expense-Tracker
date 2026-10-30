import { request, downloadBackup, ApiError } from "@/services/api";
import type {
  Preferences,
  PreferencesInput,
  BackupFile,
  RestoreResult,
} from "@/types/finance";
export const settingsService = {
  get: () => request<Preferences>("/settings"),
  save: (body: PreferencesInput) =>
    request<Preferences>("/settings", "PATCH", body),
  backups: () => request<BackupFile[]>("/backups"),
  backup: downloadBackup,
  restore: async (backup: unknown, confirmation: string) => {
    try {
      return await request<RestoreResult>("/backups/restore", "POST", {
        backup,
        confirmation,
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 422)
        throw new ApiError(
          "This is not a supported Expense Tracker backup. Choose a JSON backup created from Settings.",
          422,
        );
      throw error;
    }
  },
};

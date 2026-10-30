"use client";
import { useState, useRef } from "react";
import { Download } from "lucide-react";
import { Field, ErrorState } from "@/components/ui/Primitives";
import { useWorkspace } from "@/components/layouts/WorkspaceProvider";
import { useMutation } from "@/hooks/useMutation";
import { useResource } from "@/hooks/useResource";
import { settingsService } from "../services/settingsService";
export function BackupPanel() {
  const fileInput = useRef<HTMLInputElement>(null);
  const { setPreferences, notify } = useWorkspace();
  const { run, busy } = useMutation();
  const [file, setFile] = useState<File | null>(null),
    [confirmation, setConfirmation] = useState("");
  return (
    <section className="panel">
      <h2>Backup & restore</h2>
      <p className="muted">
        Download a complete copy of your records. Keep a copy somewhere safe on
        your device.
      </p>
      <button
        disabled={busy}
        onClick={() =>
          run(settingsService.backup, "Backup created and downloaded")
        }
      >
        <Download size={17} /> Backup now
      </button>
      <hr />
      <h3>Restore from backup</h3>
      <p className="muted">
        Restore replaces every current record. A safety backup is saved locally
        first.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!file) return;
          if (file.size > 20 * 1024 * 1024) {
            notify("Choose a backup smaller than 20 MB.", true);
            return;
          }
          if (
            !window.confirm(
              "Replace all current records with this backup? A safety backup will be created first.",
            )
          )
            return;
          const result = await run(async () => {
            let backup: unknown;
            try {
              backup = JSON.parse(await file.text());
            } catch {
              throw new Error("Choose a valid JSON backup");
            }
            const restored = await settingsService.restore(
              backup,
              confirmation,
            );
            setPreferences(await settingsService.get());
            return restored;
          }, "Backup restored. The previous data is available in a safety backup.");
          if (result) {
            setConfirmation("");
            setFile(null);
            if (fileInput.current) fileInput.current.value = "";
          }
        }}
      >
        <Field label="Backup JSON file">
          <input
            required
            type="file"
            ref={fileInput}
            accept=".json,application/json"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </Field>
        <Field label="Type RESTORE to confirm replacement">
          <input
            required
            pattern="RESTORE"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <button
          className="danger"
          disabled={busy || !file || confirmation !== "RESTORE"}
        >
          Restore backup
        </button>
      </form>
    </section>
  );
}
export function BackupList() {
  const { data, error, reload } = useResource(settingsService.backups);
  return (
    <section className="panel backup-list">
      <h2>Local backup files</h2>
      <p className="muted">Includes safety backups made before restore.</p>
      {error ? (
        <ErrorState message={error} retry={reload} />
      ) : data?.length ? (
        <ul>
          {data.map((b) => (
            <li key={b.name}>
              <a href={"/api/v1/backups/" + b.name} download>
                <Download size={15} />
                {b.name}
              </a>
              <small>{Math.ceil(b.bytes / 1024)} KB</small>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No backups created yet.</p>
      )}
    </section>
  );
}

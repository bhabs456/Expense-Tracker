"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { Alert } from "@/components/ui/Alert";
import { request } from "@/services/api";
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges";
import type { Catalog, Preferences } from "@/types/finance";
interface WorkspaceState {
  catalog: Catalog | null;
  preferences: Preferences | null;
  setPreferences: (p: Preferences) => void;
  revision: number;
  refresh: () => void;
  dirty: boolean;
  setDirty: (d: boolean) => void;
  notify: (message: string, error?: boolean) => void;
  initializationError: string;
  retryInitialization: () => void;
}
const Context = createContext<WorkspaceState | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null),
    [preferences, setPreferences] = useState<Preferences | null>(null),
    [revision, setRevision] = useState(0),
    [dirty, setDirty] = useState(false),
    [notice, setNotice] = useState<{
      message: string;
      error: boolean;
      id: number;
    } | null>(null);
  const [initializationError, setInitializationError] = useState(""),
    [initializationAttempt, setInitializationAttempt] = useState(0);
  const retryInitialization = useCallback(
    () => setInitializationAttempt((value) => value + 1),
    [],
  );
  const sequence = useRef(0);
  const notify = useCallback(
    (message: string, error = false) =>
      setNotice({ message, error, id: ++sequence.current }),
    [],
  );
  const refresh = useCallback(() => setRevision((r) => r + 1), []);
  useEffect(() => {
    let active = true;
    setInitializationError("");
    Promise.all([
      request<Catalog>("/catalog"),
      request<Preferences>("/settings"),
    ])
      .then(([c, p]) => {
        if (!active) return;
        setCatalog(c);
        setPreferences(p);
      })
      .catch((e) => {
        if (active)
          setInitializationError(
            `Workspace could not connect. ${(e as Error).message}`,
          );
      });
    return () => {
      active = false;
    };
  }, [initializationAttempt]);
  useEffect(() => {
    const tick = () =>
      request<{ generated: number }>("/subscriptions/process", "POST")
        .then((r) => {
          if (r.generated) refresh();
        })
        .catch((e) => notify((e as Error).message, true));
    tick();
    const timer = setInterval(tick, 60000);
    return () => clearInterval(timer);
  }, [refresh, notify]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const theme = preferences?.theme || "system";
    const sync = () =>
      (document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [preferences?.theme]);
  useUnsavedChanges(dirty);
  return (
    <Context.Provider
      value={{
        catalog,
        preferences,
        setPreferences,
        revision,
        refresh,
        dirty,
        setDirty,
        notify,
        initializationError,
        retryInitialization,
      }}
    >
      {children}
      {notice && (
        <Alert
          floating
          variant={notice.error ? "error" : "success"}
          resetKey={notice.id}
          onDismiss={() => setNotice(null)}
        >
          {notice.message}
        </Alert>
      )}
    </Context.Provider>
  );
}
export function useWorkspace() {
  const context = useContext(Context);
  if (!context) throw new Error("Workspace provider missing");
  return context;
}

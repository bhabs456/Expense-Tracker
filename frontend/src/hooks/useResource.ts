"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useWorkspace } from "@/components/layouts/WorkspaceProvider";
export function useResource<T>(loader: () => Promise<T>, key = "") {
  const { revision } = useWorkspace();
  const current = useRef(loader);
  const hasData = useRef(false);
  current.current = loader;
  const [data, setData] = useState<T | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  const reload = useCallback(() => setRetry((r) => r + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(!hasData.current);
    setError("");
    current
      .current()
      .then((d) => {
        if (active) {
          setData(d);
          hasData.current = true;
        }
      })
      .catch((e) => {
        if (active) setError((e as Error).message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [key, revision, retry]);
  return { data, loading, error, reload };
}

"use client";
import { useEffect } from "react";
/** Covers tab closure plus browser back/forward where the Navigation API is available. */
export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: Event) => {
      const navigation = event as Event & {
        navigationType?: string;
        cancelable: boolean;
      };
      if (
        navigation.navigationType === "traverse" &&
        navigation.cancelable &&
        !window.confirm("Leave without saving your expense batch?")
      )
        event.preventDefault();
    };
    const browserNavigation = (window as Window & { navigation?: EventTarget })
      .navigation;
    window.addEventListener("beforeunload", beforeUnload);
    browserNavigation?.addEventListener("navigate", navigate);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      browserNavigation?.removeEventListener("navigate", navigate);
    };
  }, [dirty]);
}

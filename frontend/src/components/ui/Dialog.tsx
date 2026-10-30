"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export function Dialog({
  title,
  children,
  onClose,
  dirty = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  dirty?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const dismissRef = useRef(onClose);
  dismissRef.current = onClose;
  const dismiss = () => {
    if (!dirtyRef.current || window.confirm("Discard unsaved changes?"))
      dismissRef.current();
  };
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const el = ref.current;
    el?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (!dirtyRef.current || window.confirm("Discard unsaved changes?"))
          dismissRef.current();
      }
      if (e.key !== "Tab") return;
      const portalRoots = Array.from(
        el?.querySelectorAll("[aria-controls]") || [],
      )
        .map((node) =>
          document.getElementById(node.getAttribute("aria-controls") || ""),
        )
        .filter((node): node is HTMLElement => !!node);
      const nodes = [el, ...portalRoots].flatMap((root) =>
        root
          ? Array.from(
              root.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input:not(:disabled),select,textarea,[tabindex="0"]',
              ),
            )
          : [],
      );
      if (!nodes?.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <section
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
      >
        <div className="panel-heading">
          <h2 id="dialog-title">{title}</h2>
          <button aria-label="Close editor" onClick={dismiss}>
            <X size={19} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { CircleCheck, TriangleAlert, Info, CircleAlert, X } from "lucide-react";
type Variant = "success" | "error" | "warning" | "info";
const icons = {
  success: CircleCheck,
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
};
const titles = {
  success: "All set",
  error: "Something needs attention",
  warning: "A quick heads-up",
  info: "Good to know",
};
export function Alert({
  children,
  variant = "info",
  floating = false,
  onDismiss,
  resetKey,
}: {
  children: ReactNode;
  variant?: Variant;
  floating?: boolean;
  onDismiss?: () => void;
  resetKey?: string | number;
}) {
  const [visible, setVisible] = useState(true);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      dismissRef.current?.();
    }, 5000);
    return () => clearTimeout(timer);
  }, [resetKey]);
  if (!visible) return null;
  const Icon = icons[variant];
  return (
    <div
      className={`notice notice-${variant} ${floating ? "toast" : ""}`}
      role={variant === "error" ? "alert" : "status"}
    >
      <span className="notice-symbol">
        <Icon size={20} />
      </span>
      <div className="notice-copy">
        <b>{titles[variant]}</b>
        <div>{children}</div>
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={() => {
          setVisible(false);
          dismissRef.current?.();
        }}
      >
        <X size={16} />
      </button>
      <i key={resetKey} className="notice-countdown" aria-hidden="true" />
    </div>
  );
}

"use client";
import { ErrorState } from "@/components/ui/Primitives";
import { Alert } from "@/components/ui/Alert";
import {
  useState,
  useEffect,
  useRef,
  type ReactNode,
  type MouseEvent,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Plus,
  CalendarDays,
  ChartNoAxesCombined,
  PiggyBank,
  ArrowLeftRight,
  Repeat,
  Wallet,
  ReceiptText,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import { useWorkspace } from "./WorkspaceProvider";
import { useMutation } from "@/hooks/useMutation";
import { settingsService } from "@/modules/settings";
const nav = [
  ["/dashboard", "Dashboard", LayoutDashboard],
  ["/add-expense", "Add Expense", Plus],
  ["/calendar", "Calendar", CalendarDays],
  ["/analytics", "Analytics", ChartNoAxesCombined],
  ["/savings", "Savings", PiggyBank],
  ["/savings-transactions", "Savings Transactions", ArrowLeftRight],
  ["/subscriptions", "Subscriptions", Repeat],
  ["/stipends", "Stipends", Wallet],
  ["/history", "Expense History", ReceiptText],
  ["/settings", "Settings", Settings],
] as const;
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false),
    [drawerOpen, setDrawerOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 760px)");
    const update = () => {
      setMobile(query.matches);
      if (!query.matches) setDrawerOpen(false);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!mobile || !drawerOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDrawerOpen(false);
      }
      if (event.key !== "Tab") return;
      const nodes = sidebarRef.current?.querySelectorAll<HTMLElement>(
        "a,button:not(:disabled)",
      );
      if (!nodes?.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [mobile, drawerOpen]);
  const {
    catalog,
    preferences,
    setPreferences,
    dirty,
    setDirty,
    initializationError,
    retryInitialization,
  } = useWorkspace();
  const { run, busy } = useMutation();
  const currentPage = nav.find(([url]) => url === path)?.[1] || "Workspace";
  const navigate = (event: MouseEvent<HTMLAnchorElement>, url: string) => {
    if (path === url) {
      setDrawerOpen(false);
      return;
    }
    if (dirty && !window.confirm("Leave without saving your expense batch?"))
      event.preventDefault();
    else {
      setDirty(false);
      setDrawerOpen(false);
    }
  };
  return (
    <div
      className={
        "shell transition-[grid-template-columns] duration-300 ease-in-out motion-reduce:transition-none " +
        (collapsed ? "collapsed" : "")
      }
    >
      <button
        type="button"
        className="drawer-backdrop"
        data-open={drawerOpen}
        tabIndex={-1}
        aria-hidden="true"
        aria-label="Close navigation backdrop"
        onClick={() => setDrawerOpen(false)}
      />
      <aside
        ref={sidebarRef}
        className="sidebar mobile-drawer"
        data-open={drawerOpen}
        inert={mobile && !drawerOpen}
        aria-hidden={mobile && !drawerOpen}
        id="workspace-sidebar"
        role={mobile && drawerOpen ? "dialog" : undefined}
        aria-modal={mobile && drawerOpen ? true : undefined}
        aria-label={mobile ? "Navigation" : undefined}
      >
        <div className="brand">
          <span className="brand-icon">
            <Wallet size={23} />
          </span>
          {(!collapsed || mobile) && (
            <span>
              paisa<span className="brand-dot">.</span>
            </span>
          )}
        </div>
        <button
          className="sidebar-toggle"
          aria-label={mobile ? "Close navigation" : "Toggle sidebar"}
          aria-expanded={mobile ? drawerOpen : !collapsed}
          aria-controls="workspace-navigation"
          onClick={() =>
            mobile ? setDrawerOpen(false) : setCollapsed(!collapsed)
          }
        >
          {mobile ? (
            <>
              <span>YOUR WORKSPACE</span>
              <X size={19} />
            </>
          ) : collapsed ? (
            <PanelLeftOpen size={18} />
          ) : (
            <>
              <span>YOUR WORKSPACE</span>
              <PanelLeftClose size={17} />
            </>
          )}
        </button>
        <nav id="workspace-navigation" aria-label="Main navigation">
          {nav.map(([url, label, Icon]) => (
            <Link
              key={url}
              href={url}
              title={label}
              aria-label={label}
              aria-current={path === url ? "page" : undefined}
              className={path === url ? "active" : ""}
              onClick={(event) => navigate(event, url)}
            >
              <span className="nav-glyph" aria-hidden="true">
                <Icon size={19} />
              </span>
              <span className="nav-label transition-[max-width,opacity,transform] duration-200 ease-out motion-reduce:transition-none">
                {label}
              </span>
            </Link>
          ))}
        </nav>
        <div className="privacy">
          <ShieldCheck size={20} />
          {(!collapsed || mobile) && (
            <div>
              <b>Yours. Only yours.</b>
              <small>Stored locally on this device</small>
            </div>
          )}
        </div>
      </aside>
      <main inert={mobile && drawerOpen}>
        <div className="topbar">
          <div className="topbar-context">
            <button
              type="button"
              className="mobile-menu"
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
              aria-controls="workspace-sidebar"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div>
              <span className="workspace-status">
                <i /> LOCAL ONLY
              </span>
              <b>{currentPage}</b>
            </div>
          </div>
          <div className="topbar-actions">
            <Link
              className="topbar-quick"
              href="/add-expense"
              aria-label="Quick add expense"
              title="Add an expense"
              onClick={(e) => navigate(e, "/add-expense")}
            >
              <Plus size={17} />
              <span>Add expense</span>
            </Link>
            <Link
              className="topbar-icon"
              href="/history"
              aria-label="Open expense history"
              title="Expense history"
              onClick={(e) => navigate(e, "/history")}
            >
              <ReceiptText size={18} />
            </Link>
            <span className="currency" title="Indian rupees (INR)">
              ₹ Rupees
            </span>
            <button
              disabled={busy || !preferences}
              aria-label="Toggle light and dark theme"
              onClick={() => {
                if (!preferences) return;
                const p = {
                  minimum_savings_percent: preferences.minimum_savings_percent,
                  stretch_savings_percent: preferences.stretch_savings_percent,
                  default_payment_method: preferences.default_payment_method,
                  theme:
                    document.documentElement.dataset.theme === "dark"
                      ? ("light" as const)
                      : ("dark" as const),
                };
                run(async () => {
                  const saved = await settingsService.save(p);
                  setPreferences(saved);
                  return saved;
                }, "Theme updated");
              }}
            >
              {preferences?.theme === "dark" ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>
            <div className="avatar">ME</div>
          </div>
        </div>
        <div className="content">
          {initializationError && (
            <ErrorState
              message={initializationError}
              retry={retryInitialization}
              retryLabel="Reconnect workspace"
            />
          )}
          {catalog && catalog.today < catalog.tracking_start && (
            <Alert variant="info">
              Tracking opens on 1 November 2026. You can set up your October
              stipend, subscriptions, and preferences now. Your opening savings
              balance is ₹0.
            </Alert>
          )}
          {children}
          <footer className="app-footer">
            <span>
              <ShieldCheck size={13} /> Private by design. Local by default.
            </span>
            <span>November 2026 onwards · Asia/Kolkata</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

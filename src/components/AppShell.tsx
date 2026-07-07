import { BarChart3, Clock3, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  activeTab: "timer" | "stats";
  onOpenSettings: () => void;
  onTabChange: (tab: "timer" | "stats") => void;
  children: ReactNode;
};

export function AppShell({ activeTab, onOpenSettings, onTabChange, children }: Props) {
  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="brand">Bird View</p>
          <p className="version">v1.0.0</p>
        </div>
        <nav className="tabs" aria-label="Main navigation">
          <button className={activeTab === "timer" ? "tab active" : "tab"} onClick={() => onTabChange("timer")}>
            <Clock3 size={16} aria-hidden="true" />
            Timer
          </button>
          <button className={activeTab === "stats" ? "tab active" : "tab"} onClick={() => onTabChange("stats")}>
            <BarChart3 size={16} aria-hidden="true" />
            Stats
          </button>
        </nav>
        <button className="settings-trigger" onClick={onOpenSettings} aria-label="Open timer settings">
          <SlidersHorizontal size={17} />
          Control
        </button>
      </header>
      <main>{children}</main>
    </div>
  );
}

import type { ReactNode } from "react";

type Props = {
  activeTab: "timer" | "stats";
  onOpenSettings: () => void;
  onTabChange: (tab: "timer" | "stats") => void;
  children: ReactNode;
};

export function AppShell({ children }: Props) {
  return (
    <div className="app">
      <header className="topbar">
        <div>
          <p className="brand">Bird View</p>
          <p className="version">v1.0.0</p>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}

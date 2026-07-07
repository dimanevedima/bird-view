import { useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import { StatsScreen } from "./components/StatsScreen";
import { TimerScreen } from "./components/TimerScreen";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useTimer } from "./hooks/useTimer";
import type { AppState } from "./types";

const STORAGE_KEY = "bird-view-timer-state";

const initialState: AppState = {
  settings: {
    activePresetId: "5-45",
    soundEnabled: false,
  },
  currentTask: "Finish intro",
  sessions: [],
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"timer" | "stats">("timer");
  const [appState, setAppState] = useLocalStorage<AppState>(STORAGE_KEY, initialState);
  const timer = useTimer({ appState, setAppState });
  const stableState = useMemo(() => appState, [appState]);

  return (
    <AppShell activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === "timer" ? (
        <TimerScreen appState={stableState} setAppState={setAppState} timer={timer} />
      ) : (
        <StatsScreen sessions={stableState.sessions} />
      )}
    </AppShell>
  );
}

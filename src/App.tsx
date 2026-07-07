import { useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import { StatsScreen } from "./components/StatsScreen";
import { TimerSettingsPanel } from "./components/TimerSettingsPanel";
import { TimerScreen } from "./components/TimerScreen";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useTimer } from "./hooks/useTimer";
import type { AppState } from "./types";

const STORAGE_KEY = "bird-view-timer-state";

const initialState: AppState = {
  settings: {
    activePresetId: "5-45",
    focusMode: "bird",
    soundEnabled: true,
    soundId: "soft",
  },
  currentTask: "Finish intro",
  sessions: [],
  customPresets: [],
};

export default function App() {
  const [activeTab, setActiveTab] = useState<"timer" | "stats">("timer");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storedState, setAppState] = useLocalStorage<AppState>(STORAGE_KEY, initialState);
  const appState = useMemo<AppState>(
    () => ({
      ...initialState,
      ...storedState,
      settings: {
        ...initialState.settings,
        ...(storedState.settings ?? {}),
      },
      sessions: storedState.sessions ?? [],
      customPresets: storedState.customPresets ?? [],
    }),
    [storedState],
  );
  const timer = useTimer({ appState, setAppState });

  return (
    <AppShell activeTab={activeTab} onOpenSettings={() => setSettingsOpen(true)} onTabChange={setActiveTab}>
      {activeTab === "timer" ? (
        <TimerScreen appState={appState} setAppState={setAppState} timer={timer} onOpenSettings={() => setSettingsOpen(true)} />
      ) : (
        <StatsScreen sessions={appState.sessions} />
      )}
      {settingsOpen ? (
        <TimerSettingsPanel appState={appState} setAppState={setAppState} onClose={() => setSettingsOpen(false)} />
      ) : null}
    </AppShell>
  );
}

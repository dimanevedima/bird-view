import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import { StatsScreen } from "./components/StatsScreen";
import { TimerSettingsPanel } from "./components/TimerSettingsPanel";
import { TimerScreen } from "./components/TimerScreen";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useTimer } from "./hooks/useTimer";
import { useWakeLock } from "./hooks/useWakeLock";
import type { AppState } from "./types";

const STORAGE_KEY = "bird-view-timer-state";

const initialState: AppState = {
  settings: {
    activePresetId: "3-30",
    focusMode: "bird",
    soundEnabled: true,
    soundId: "soft",
    notificationsEnabled: false,
  },
  currentTask: "Finish intro",
  sessions: [],
  segments: [],
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
      segments: storedState.segments ?? [],
      customPresets: storedState.customPresets ?? [],
    }),
    [storedState],
  );
  const timer = useTimer({ appState, setAppState });

  useWakeLock(true);

  useEffect(() => {
    async function lockPortrait() {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: "portrait-primary" | "portrait") => Promise<void>;
      };
      await orientation.lock?.("portrait-primary").catch(() => undefined);
    }

    lockPortrait();
    document.addEventListener("visibilitychange", lockPortrait);
    window.addEventListener("orientationchange", lockPortrait);
    return () => {
      document.removeEventListener("visibilitychange", lockPortrait);
      window.removeEventListener("orientationchange", lockPortrait);
    };
  }, []);

  return (
    <AppShell activeTab={activeTab} onOpenSettings={() => setSettingsOpen(true)} onTabChange={setActiveTab}>
      {activeTab === "timer" ? (
        <TimerScreen
          appState={appState}
          setAppState={setAppState}
          timer={timer}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenStats={() => setActiveTab("stats")}
        />
      ) : (
        <StatsScreen appState={appState} setAppState={setAppState} onBack={() => setActiveTab("timer")} />
      )}
      {settingsOpen ? (
        <TimerSettingsPanel appState={appState} setAppState={setAppState} onClose={() => setSettingsOpen(false)} />
      ) : null}
    </AppShell>
  );
}

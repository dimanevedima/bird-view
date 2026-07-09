import { useEffect, useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import { StatsScreen } from "./components/StatsScreen";
import { TimerSettingsPanel } from "./components/TimerSettingsPanel";
import { TimerScreen } from "./components/TimerScreen";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useTimer } from "./hooks/useTimer";
import { useWakeLock } from "./hooks/useWakeLock";
import { presets } from "./data/presets";
import type { AppState, FocusSegment, SoundId, TimerMode, TimerPreset, TimerSession, WorkProfile } from "./types";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safePositiveNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function safeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function safeWorkProfile(value: unknown, fallback: WorkProfile): WorkProfile {
  return value === "bird" || value === "pixel" ? value : fallback;
}

function safeTimerMode(value: unknown, fallback: TimerMode): TimerMode {
  return value === "bird" || value === "pixel" || value === "empty" ? value : fallback;
}

function safeSoundId(value: unknown, fallback: SoundId): SoundId {
  return value === "soft" || value === "wood" || value === "glass" || value === "tape" ? value : fallback;
}

function safeDateString(value: unknown) {
  if (typeof value !== "string") return new Date().toISOString();
  return Number.isNaN(new Date(value).getTime()) ? new Date().toISOString() : value;
}

function sanitizePreset(value: unknown): TimerPreset | null {
  if (!isRecord(value)) return null;
  const mode = safeWorkProfile(value.mode, "bird");
  const workSeconds = safePositiveNumber(value.workSeconds, mode === "pixel" ? 2700 : 180);
  const restSeconds = safePositiveNumber(value.restSeconds, mode === "pixel" ? 600 : 30);
  const id = safeString(value.id, `custom-${mode}-${workSeconds}-${restSeconds}`);
  return {
    id,
    label: safeString(value.label, `${Math.round(workSeconds / 60)} / ${Math.round(restSeconds / 60)}`),
    workSeconds,
    restSeconds,
    mode,
  };
}

function sanitizeSession(value: unknown): TimerSession | null {
  if (!isRecord(value)) return null;
  const id = safeString(value.id);
  if (!id) return null;
  const session: TimerSession = {
    id,
    startedAt: safeDateString(value.startedAt),
    task: typeof value.task === "string" ? value.task : undefined,
  };
  if (typeof value.endedAt === "string" && !Number.isNaN(new Date(value.endedAt).getTime())) {
    session.endedAt = value.endedAt;
  }
  return session;
}

function sanitizeSegment(value: unknown): FocusSegment | null {
  if (!isRecord(value)) return null;
  const id = safeString(value.id);
  const sessionId = safeString(value.sessionId);
  if (!id || !sessionId) return null;
  return {
    id,
    sessionId,
    mode: safeTimerMode(value.mode, "bird"),
    startedAt: safeDateString(value.startedAt),
    durationSeconds: safePositiveNumber(value.durationSeconds, 1),
  };
}

function sanitizeAppState(value: unknown): AppState {
  const source = isRecord(value) ? value : {};
  const sourceSettings = isRecord(source.settings) ? source.settings : {};
  const customPresets = Array.isArray(source.customPresets)
    ? source.customPresets.map(sanitizePreset).filter((preset): preset is TimerPreset => preset !== null)
    : [];
  const allPresets = [...presets, ...customPresets];
  const knownPresetIds = new Set(allPresets.map((preset) => preset.id));
  const activePresetId = safeString(sourceSettings.activePresetId, initialState.settings.activePresetId);
  const safeActivePresetId = knownPresetIds.has(activePresetId) ? activePresetId : initialState.settings.activePresetId;
  const activePreset = allPresets.find((preset) => preset.id === safeActivePresetId);

  return {
    settings: {
      activePresetId: safeActivePresetId,
      focusMode: activePreset?.mode ?? safeWorkProfile(sourceSettings.focusMode, initialState.settings.focusMode),
      soundEnabled: safeBoolean(sourceSettings.soundEnabled, initialState.settings.soundEnabled),
      soundId: safeSoundId(sourceSettings.soundId, initialState.settings.soundId),
      notificationsEnabled: safeBoolean(
        sourceSettings.notificationsEnabled,
        initialState.settings.notificationsEnabled,
      ),
    },
    currentTask: safeString(source.currentTask, initialState.currentTask),
    sessions: Array.isArray(source.sessions)
      ? source.sessions.map(sanitizeSession).filter((session): session is TimerSession => session !== null)
      : [],
    segments: Array.isArray(source.segments)
      ? source.segments.map(sanitizeSegment).filter((segment): segment is FocusSegment => segment !== null)
      : [],
    customPresets,
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<"timer" | "stats">("timer");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [storedState, setAppState] = useLocalStorage<AppState>(STORAGE_KEY, initialState);
  const appState = useMemo<AppState>(() => sanitizeAppState(storedState), [storedState]);
  const timer = useTimer({ appState, setAppState });

  useWakeLock(timer.status === "running");

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

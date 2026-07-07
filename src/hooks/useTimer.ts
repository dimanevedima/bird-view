import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { presets } from "../data/presets";
import type { AppState, TimerMode, TimerPreset, TimerRuntime, TimerSession, TimerStatus } from "../types";
import { playSound } from "../utils/sound";

const RUNTIME_KEY = "bird-view-timer-runtime";

type TimerControls = {
  appState: AppState;
  setAppState: Dispatch<SetStateAction<AppState>>;
};

function readRuntime(): TimerRuntime | null {
  try {
    const item = window.localStorage.getItem(RUNTIME_KEY);
    return item ? (JSON.parse(item) as TimerRuntime) : null;
  } catch {
    return null;
  }
}

function writeRuntime(runtime: TimerRuntime) {
  window.localStorage.setItem(RUNTIME_KEY, JSON.stringify(runtime));
}

function nextModeFor(currentMode: TimerMode, preset: TimerPreset): TimerMode {
  return currentMode === "empty" ? preset.mode : "empty";
}

function durationFor(mode: TimerMode, preset: TimerPreset) {
  return mode === "empty" ? preset.restSeconds : preset.workSeconds;
}

function hydrateRuntime(runtime: TimerRuntime | null, preset: TimerPreset) {
  if (!runtime || runtime.presetId !== preset.id) {
    return {
      mode: preset.mode,
      status: "idle" as TimerStatus,
      remaining: preset.workSeconds,
      sessionId: null,
    };
  }

  let mode = runtime.mode;
  let remaining = Math.max(1, runtime.remaining);
  if (runtime.status === "running") {
    let elapsed = Math.max(0, Math.floor((Date.now() - runtime.updatedAt) / 1000));
    while (elapsed >= remaining) {
      elapsed -= remaining;
      mode = nextModeFor(mode, preset);
      remaining = durationFor(mode, preset);
    }
    remaining = Math.max(1, remaining - elapsed);
  }

  return {
    mode,
    status: runtime.status,
    remaining,
    sessionId: runtime.sessionId,
  };
}

export function useTimer({ appState, setAppState }: TimerControls) {
  const allPresets = useMemo(() => [...presets, ...(appState.customPresets ?? [])], [appState.customPresets]);
  const activePreset = useMemo(
    () => allPresets.find((preset) => preset.id === appState.settings.activePresetId) ?? allPresets[0],
    [allPresets, appState.settings.activePresetId],
  );
  const initialRuntime = useMemo(() => hydrateRuntime(readRuntime(), activePreset), [activePreset]);
  const [mode, setMode] = useState<TimerMode>(initialRuntime.mode);
  const [status, setStatus] = useState<TimerStatus>(initialRuntime.status);
  const [remaining, setRemaining] = useState(initialRuntime.remaining);
  const currentSessionId = useRef<string | null>(initialRuntime.sessionId);

  useEffect(() => {
    const runtime = hydrateRuntime(readRuntime(), activePreset);
    currentSessionId.current = runtime.sessionId;
    setMode(runtime.mode);
    setStatus(runtime.status);
    setRemaining(runtime.remaining);
  }, [activePreset.id]);

  useEffect(() => {
    writeRuntime({
      presetId: activePreset.id,
      mode,
      status,
      remaining,
      updatedAt: Date.now(),
      sessionId: currentSessionId.current,
    });
  }, [activePreset.id, mode, remaining, status]);

  useEffect(() => {
    if (status !== "running") return;
    const intervalId = window.setInterval(() => {
      setRemaining((seconds) => {
        if (seconds > 1) return seconds - 1;
        completePhase();
        return 1;
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [status, mode, activePreset]);

  const duration = durationFor(mode, activePreset);
  const progress = duration ? 1 - remaining / duration : 0;

  function ensureSession() {
    if (currentSessionId.current) return currentSessionId.current;
    const id = crypto.randomUUID();
    currentSessionId.current = id;
    const session: TimerSession = {
      id,
      startedAt: new Date().toISOString(),
      task: appState.currentTask,
      workSecondsCompleted: 0,
      restSecondsCompleted: 0,
      birdPulsesCompleted: 0,
      emptySpacesCompleted: 0,
      pixelBlocksCompleted: 0,
    };
    setAppState((state) => ({ ...state, sessions: [...state.sessions, session] }));
    return id;
  }

  function updateSession(mutator: (session: TimerSession) => TimerSession) {
    const id = ensureSession();
    setAppState((state) => ({
      ...state,
      sessions: state.sessions.map((session) => (session.id === id ? mutator(session) : session)),
    }));
  }

  function completePhase() {
    updateSession((session) => {
      if (mode === "empty") {
        return {
          ...session,
          restSecondsCompleted: session.restSecondsCompleted + activePreset.restSeconds,
          emptySpacesCompleted: session.emptySpacesCompleted + 1,
        };
      }
      const isPixel = mode === "pixel";
      return {
        ...session,
        workSecondsCompleted: session.workSecondsCompleted + activePreset.workSeconds,
        birdPulsesCompleted: session.birdPulsesCompleted + (isPixel ? 0 : 1),
        pixelBlocksCompleted: session.pixelBlocksCompleted + (isPixel ? 1 : 0),
      };
    });
    const nextMode = nextModeFor(mode, activePreset);
    setMode(nextMode);
    setRemaining(durationFor(nextMode, activePreset));
    playSound(appState.settings.soundId, "phase", appState.settings.soundEnabled);
  }

  function start() {
    ensureSession();
    setStatus("running");
    playSound(appState.settings.soundId, "click", appState.settings.soundEnabled);
  }

  function pause() {
    setStatus("paused");
    playSound(appState.settings.soundId, "click", appState.settings.soundEnabled);
  }

  function skip() {
    completePhase();
  }

  function reset() {
    setStatus("idle");
    setMode(activePreset.mode);
    setRemaining(activePreset.workSeconds);
    if (currentSessionId.current) {
      const id = currentSessionId.current;
      setAppState((state) => ({
        ...state,
        sessions: state.sessions.map((session) =>
          session.id === id && !session.endedAt ? { ...session, endedAt: new Date().toISOString() } : session,
        ),
      }));
    }
    currentSessionId.current = null;
    playSound(appState.settings.soundId, "toggle", appState.settings.soundEnabled);
  }

  return {
    activePreset,
    mode,
    status,
    remaining,
    duration,
    progress,
    allPresets,
    start,
    pause,
    skip,
    reset,
  };
}

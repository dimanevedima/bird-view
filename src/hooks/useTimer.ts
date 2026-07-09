import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { presets } from "../data/presets";
import type { AppState, TimerMode, TimerPreset, TimerRuntime, TimerSession, TimerStatus } from "../types";
import { startKeepAlive, stopKeepAlive } from "../utils/backgroundKeepAlive";
import { notifyCatchUp, notifyPhaseComplete } from "../utils/notifications";
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

type CompletionTally = {
  workSeconds: number;
  restSeconds: number;
  birdPulses: number;
  emptySpaces: number;
  pixelBlocks: number;
};

function emptyTally(): CompletionTally {
  return { workSeconds: 0, restSeconds: 0, birdPulses: 0, emptySpaces: 0, pixelBlocks: 0 };
}

function tallyIsEmpty(tally: CompletionTally) {
  return !tally.workSeconds && !tally.restSeconds && !tally.birdPulses && !tally.emptySpaces && !tally.pixelBlocks;
}

function recordCompletion(mode: TimerMode, preset: TimerPreset, tally: CompletionTally) {
  if (mode === "empty") {
    tally.restSeconds += preset.restSeconds;
    tally.emptySpaces += 1;
  } else {
    tally.workSeconds += preset.workSeconds;
    if (mode === "pixel") tally.pixelBlocks += 1;
    else tally.birdPulses += 1;
  }
}

function applyTally(session: TimerSession, tally: CompletionTally): TimerSession {
  return {
    ...session,
    workSecondsCompleted: session.workSecondsCompleted + tally.workSeconds,
    restSecondsCompleted: session.restSecondsCompleted + tally.restSeconds,
    birdPulsesCompleted: session.birdPulsesCompleted + tally.birdPulses,
    emptySpacesCompleted: session.emptySpacesCompleted + tally.emptySpaces,
    pixelBlocksCompleted: session.pixelBlocksCompleted + tally.pixelBlocks,
  };
}

function hydrateRuntime(runtime: TimerRuntime | null, preset: TimerPreset) {
  if (!runtime || runtime.presetId !== preset.id) {
    return {
      mode: preset.mode,
      status: "idle" as TimerStatus,
      remaining: preset.workSeconds,
      sessionId: null,
      tally: emptyTally(),
    };
  }

  let mode = runtime.mode;
  let remaining = Math.max(1, runtime.remaining);
  const tally = emptyTally();
  if (runtime.status === "running") {
    let elapsed = Math.max(0, Math.floor((Date.now() - runtime.updatedAt) / 1000));
    while (elapsed >= remaining) {
      elapsed -= remaining;
      recordCompletion(mode, preset, tally);
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
    tally,
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
    const hydrated = hydrateRuntime(readRuntime(), activePreset);
    currentSessionId.current = hydrated.sessionId;
    setMode(hydrated.mode);
    setStatus(hydrated.status);
    setRemaining(hydrated.remaining);
    if (hydrated.sessionId && !tallyIsEmpty(hydrated.tally)) {
      updateSession((session) => applyTally(session, hydrated.tally));
    }
    if (hydrated.status === "running") startKeepAlive();
  }, [activePreset.id]);

  useEffect(() => {
    if (status !== "idle") return;
    setMode(activePreset.mode);
    setRemaining(durationFor(activePreset.mode, activePreset));
  }, [status, activePreset.mode, activePreset.workSeconds, activePreset.restSeconds]);

  useEffect(() => {
    function resyncAfterBackground() {
      if (document.visibilityState !== "visible") return;
      const runtime = readRuntime();
      if (!runtime || runtime.presetId !== activePreset.id || runtime.status !== "running") return;
      const hydrated = hydrateRuntime(runtime, activePreset);
      setMode(hydrated.mode);
      setRemaining(hydrated.remaining);
      startKeepAlive();
      if (!tallyIsEmpty(hydrated.tally)) {
        updateSession((session) => applyTally(session, hydrated.tally));
        if (appState.settings.notificationsEnabled) {
          notifyCatchUp(hydrated.tally.birdPulses + hydrated.tally.pixelBlocks, hydrated.tally.emptySpaces, hydrated.mode);
        }
      }
    }
    document.addEventListener("visibilitychange", resyncAfterBackground);
    window.addEventListener("focus", resyncAfterBackground);
    return () => {
      document.removeEventListener("visibilitychange", resyncAfterBackground);
      window.removeEventListener("focus", resyncAfterBackground);
    };
  }, [activePreset, appState.settings.notificationsEnabled]);

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
    if (appState.settings.notificationsEnabled) {
      notifyPhaseComplete(mode, nextMode);
    }
  }

  function start() {
    ensureSession();
    setStatus("running");
    startKeepAlive();
    playSound(appState.settings.soundId, "click", appState.settings.soundEnabled);
  }

  function pause() {
    setStatus("paused");
    stopKeepAlive();
    playSound(appState.settings.soundId, "click", appState.settings.soundEnabled);
  }

  function skip() {
    completePhase();
  }

  function reset() {
    setStatus("idle");
    setMode(activePreset.mode);
    setRemaining(activePreset.workSeconds);
    stopKeepAlive();
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

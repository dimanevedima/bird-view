import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { presets } from "../data/presets";
import type { AppState, TimerMode, TimerPreset, TimerRuntime, TimerSession, TimerStatus } from "../types";
import { startKeepAlive, stopKeepAlive } from "../utils/backgroundKeepAlive";
import { notifyCatchUp, notifyPhaseComplete } from "../utils/notifications";
import { playSound } from "../utils/sound";

const RUNTIME_KEY = "bird-view-timer-runtime";

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

type TimerControls = {
  appState: AppState;
  setAppState: Dispatch<SetStateAction<AppState>>;
};

type CompletedSegment = {
  mode: TimerMode;
  durationSeconds: number;
  startedAt: number;
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
  try {
    window.localStorage.setItem(RUNTIME_KEY, JSON.stringify(runtime));
  } catch {
    // Timer should keep working even if storage is unavailable in PWA/private contexts.
  }
}

function nextModeFor(currentMode: TimerMode, preset: TimerPreset): TimerMode {
  return currentMode === "empty" ? preset.mode : "empty";
}

function positiveSeconds(value: unknown, fallback = 1) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function durationFor(mode: TimerMode, preset: TimerPreset) {
  const fallback = positiveSeconds(preset.workSeconds);
  return mode === "empty" ? positiveSeconds(preset.restSeconds, fallback) : fallback;
}

function safeRuntimeMode(value: unknown, fallback: TimerMode): TimerMode {
  return value === "bird" || value === "pixel" || value === "empty" ? value : fallback;
}

function safeRuntimeStatus(value: unknown): TimerStatus {
  return value === "running" || value === "paused" || value === "idle" ? value : "idle";
}

function hydrateRuntime(runtime: TimerRuntime | null, preset: TimerPreset) {
  if (!runtime || runtime.presetId !== preset.id) {
    return {
      mode: preset.mode,
      status: "idle" as TimerStatus,
      remaining: preset.workSeconds,
      sessionId: null,
      completedSegments: [] as CompletedSegment[],
    };
  }

  let mode = safeRuntimeMode(runtime.mode, preset.mode);
  const status = safeRuntimeStatus(runtime.status);
  let remaining = positiveSeconds(runtime.remaining);
  const completedSegments: CompletedSegment[] = [];
  let cursor = positiveSeconds(runtime.updatedAt, Date.now());
  if (status === "running") {
    let elapsed = Math.max(0, Math.floor((Date.now() - cursor) / 1000));
    while (elapsed >= remaining) {
      const durationSeconds = durationFor(mode, preset);
      completedSegments.push({ mode, durationSeconds, startedAt: cursor });
      cursor += durationSeconds * 1000;
      elapsed -= remaining;
      mode = nextModeFor(mode, preset);
      remaining = durationFor(mode, preset);
    }
    remaining = positiveSeconds(remaining - elapsed);
  }

  return {
    mode,
    status,
    remaining,
    sessionId: typeof runtime.sessionId === "string" ? runtime.sessionId : null,
    completedSegments,
  };
}

export function useTimer({ appState, setAppState }: TimerControls) {
  const customPresets = Array.isArray(appState.customPresets) ? appState.customPresets : [];
  const allPresets = useMemo(() => [...presets, ...customPresets], [customPresets]);
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
    if (hydrated.completedSegments.length) appendSegments(hydrated.completedSegments);
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
      if (hydrated.completedSegments.length) {
        appendSegments(hydrated.completedSegments);
        if (appState.settings.notificationsEnabled) {
          const workCount = hydrated.completedSegments.filter((seg) => seg.mode !== "empty").length;
          notifyCatchUp(workCount, hydrated.mode);
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
      setRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [status]);

  useEffect(() => {
    if (status === "running" && remaining <= 0) completePhase();
  }, [status, remaining]);

  const duration = durationFor(mode, activePreset);
  const progress = Math.max(0, Math.min(1, duration ? 1 - positiveSeconds(remaining) / duration : 0));

  function ensureSession() {
    if (currentSessionId.current) return currentSessionId.current;
    const id = createId();
    currentSessionId.current = id;
    const session: TimerSession = {
      id,
      startedAt: new Date().toISOString(),
      task: appState.currentTask,
    };
    setAppState((state) => ({
      ...state,
      sessions: [...(Array.isArray(state.sessions) ? state.sessions : []), session],
    }));
    return id;
  }

  function appendSegments(completed: CompletedSegment[]) {
    const workSegments = completed.filter((segment) => segment.mode !== "empty");
    if (!workSegments.length) return;
    const sessionId = ensureSession();
    setAppState((state) => ({
      ...state,
      segments: [
        ...(Array.isArray(state.segments) ? state.segments : []),
        ...workSegments.map((segment) => ({
          id: createId(),
          sessionId,
          mode: segment.mode,
          startedAt: new Date(segment.startedAt).toISOString(),
          durationSeconds: segment.durationSeconds,
        })),
      ],
    }));
  }

  function completePhase() {
    const finishedMode = mode;
    const durationSeconds = durationFor(finishedMode, activePreset);
    appendSegments([{ mode: finishedMode, durationSeconds, startedAt: Date.now() - durationSeconds * 1000 }]);
    const nextMode = nextModeFor(finishedMode, activePreset);
    setMode(nextMode);
    setRemaining(durationFor(nextMode, activePreset));
    playSound(appState.settings.soundId, "phase", appState.settings.soundEnabled);
    if (appState.settings.notificationsEnabled) {
      notifyPhaseComplete(finishedMode, nextMode);
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
        sessions: (Array.isArray(state.sessions) ? state.sessions : []).map((session) =>
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

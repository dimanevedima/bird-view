import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { presets } from "../data/presets";
import type { AppState, TimerMode, TimerSession, TimerStatus } from "../types";

type TimerControls = {
  appState: AppState;
  setAppState: Dispatch<SetStateAction<AppState>>;
};

export function useTimer({ appState, setAppState }: TimerControls) {
  const activePreset = useMemo(
    () => presets.find((preset) => preset.id === appState.settings.activePresetId) ?? presets[1],
    [appState.settings.activePresetId],
  );
  const [mode, setMode] = useState<TimerMode>(activePreset.mode);
  const [status, setStatus] = useState<TimerStatus>("idle");
  const [remaining, setRemaining] = useState(activePreset.workSeconds);
  const currentSessionId = useRef<string | null>(null);

  useEffect(() => {
    if (status === "running") return;
    setMode(activePreset.mode);
    setRemaining(activePreset.workSeconds);
  }, [activePreset, status]);

  useEffect(() => {
    if (status !== "running") return;
    const intervalId = window.setInterval(() => {
      setRemaining((seconds) => {
        if (seconds > 1) return seconds - 1;
        completePhase();
        return 0;
      });
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [status, mode, activePreset]);

  const duration = mode === "empty" ? activePreset.restSeconds : activePreset.workSeconds;
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
    const nextMode = mode === "empty" ? activePreset.mode : "empty";
    setMode(nextMode);
    setRemaining(nextMode === "empty" ? activePreset.restSeconds : activePreset.workSeconds);
  }

  function start() {
    ensureSession();
    setStatus("running");
  }

  function pause() {
    setStatus("paused");
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
  }

  return {
    activePreset,
    mode,
    status,
    remaining,
    duration,
    progress,
    start,
    pause,
    skip,
    reset,
  };
}

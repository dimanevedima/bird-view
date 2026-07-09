import { useRef, useState } from "react";
import type { CSSProperties, Dispatch, PointerEvent, SetStateAction, TouchEvent } from "react";
import { BarChart2, Pause, Play, RotateCcw, Settings, SkipForward, Square } from "lucide-react";
import { birdPresets, pixelPresets } from "../data/presets";
import { IntervalPickerSheet } from "./IntervalPickerSheet";
import { MotionLight } from "./MotionLight";
import type { AppState, TimerPreset, WorkProfile } from "../types";
import { playSound } from "../utils/sound";
import { formatClock } from "../utils/time";

type TimerApi = ReturnType<typeof import("../hooks/useTimer").useTimer>;

type Props = {
  appState: AppState;
  onOpenSettings: () => void;
  onOpenStats: () => void;
  setAppState: Dispatch<SetStateAction<AppState>>;
  timer: TimerApi;
};

export function TimerScreen({ appState, onOpenSettings, onOpenStats, setAppState, timer }: Props) {
  const focusMode = appState.settings.focusMode ?? "bird";
  const pullStartY = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [intervalEditorOpen, setIntervalEditorOpen] = useState(false);
  const liveCustomIds = useRef<Record<WorkProfile, string | null>>({ bird: null, pixel: null });
  const dots = Array.from({ length: 24 }, (_, index) => index < Math.round(timer.progress * 24));
  const modeLabel = timer.mode === "bird" ? "Work Pulse" : timer.mode === "empty" ? "Empty Space" : "Pixel Block";

  function applyCustomInterval(workSeconds: number, restSeconds: number) {
    setAppState((state) => {
      const id = liveCustomIds.current[focusMode] ?? `live-${focusMode}-${Date.now()}`;
      liveCustomIds.current[focusMode] = id;
      const preset: TimerPreset = {
        id,
        label: `${Math.round(workSeconds / 60)} / ${focusMode === "pixel" ? Math.round(restSeconds / 60) : restSeconds}`,
        workSeconds,
        restSeconds,
        mode: focusMode,
      };
      const filtered = (state.customPresets ?? []).filter((existing) => existing.id !== id);
      return {
        ...state,
        settings: { ...state.settings, activePresetId: id },
        customPresets: [...filtered, preset],
      };
    });
  }

  function toggleFocusMode() {
    const nextFocusMode = focusMode === "pixel" ? "bird" : "pixel";
    const nextPreset = nextFocusMode === "pixel" ? pixelPresets[0] : birdPresets[0];
    setAppState((state) => ({
      ...state,
      settings: {
        ...state.settings,
        focusMode: nextFocusMode,
        activePresetId: nextPreset.id,
      },
    }));
    playSound(appState.settings.soundId, "toggle", appState.settings.soundEnabled);
  }

  function startPull(event: PointerEvent<HTMLButtonElement>) {
    pullStartY.current = event.clientY;
    setIsPulling(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePull(event: PointerEvent<HTMLButtonElement>) {
    if (pullStartY.current === null) return;
    event.preventDefault();
    const distance = Math.max(0, Math.min(74, event.clientY - pullStartY.current));
    setPullDistance(distance);
  }

  function endPull(event: PointerEvent<HTMLButtonElement>) {
    if (pullStartY.current === null) return;
    event.preventDefault();
    const shouldToggle = pullDistance > 46;
    pullStartY.current = null;
    setIsPulling(false);
    setPullDistance(0);
    if (shouldToggle) {
      navigator.vibrate?.(18);
      toggleFocusMode();
    }
  }

  function startTouchPull(event: TouchEvent<HTMLButtonElement>) {
    pullStartY.current = event.touches[0]?.clientY ?? null;
    setIsPulling(true);
  }

  function moveTouchPull(event: TouchEvent<HTMLButtonElement>) {
    if (pullStartY.current === null) return;
    event.preventDefault();
    const y = event.touches[0]?.clientY ?? pullStartY.current;
    const distance = Math.max(0, Math.min(74, y - pullStartY.current));
    setPullDistance(distance);
  }

  function endTouchPull(event: TouchEvent<HTMLButtonElement>) {
    if (pullStartY.current === null) return;
    event.preventDefault();
    const shouldToggle = pullDistance > 46;
    pullStartY.current = null;
    setIsPulling(false);
    setPullDistance(0);
    if (shouldToggle) {
      navigator.vibrate?.(18);
      toggleFocusMode();
    }
  }

  return (
    <section className={`timer-screen mode-${timer.mode} focus-${focusMode}`}>
      <MotionLight />
      <button className="quiet-settings" onClick={onOpenSettings} aria-label="Open timer settings">
        <Settings size={18} />
      </button>
      <button className="quiet-stats" onClick={onOpenStats} aria-label="Open weekly stats">
        <BarChart2 size={18} />
      </button>
      <button
        className={isPulling ? "pull-cord is-pulling" : "pull-cord"}
        onPointerDown={startPull}
        onPointerMove={movePull}
        onPointerUp={endPull}
        onPointerCancel={endPull}
        onTouchStart={startTouchPull}
        onTouchMove={moveTouchPull}
        onTouchEnd={endTouchPull}
        onTouchCancel={endTouchPull}
        style={{ "--pull": `${pullDistance}px` } as CSSProperties & Record<"--pull", string>}
        aria-label="Pull down to switch Bird View and Pixel View"
      >
        <span className="cord-line" />
        <span className="cord-handle" />
        <small>{focusMode === "pixel" ? "Pixel" : "Bird"}</small>
      </button>
      <section className="timer-ritual" aria-label="Timer">
        <p className="eyebrow">{focusMode === "pixel" ? "Pixel View" : "Bird View"}</p>
        <button
          className="clock-trigger"
          onClick={() => setIntervalEditorOpen(true)}
          disabled={timer.status !== "idle"}
          aria-label="Edit interval length"
        >
          <span className="clock" aria-live="polite">{formatClock(timer.remaining)}</span>
        </button>
        {timer.status === "idle" ? <p className="tap-hint">Tap to edit</p> : null}
        <p className="mode-title">{modeLabel}</p>
        <div className="progress-dots" aria-label={`${Math.round(timer.progress * 100)} percent complete`}>
          {dots.map((active, index) => (
            <span key={index} className={active ? "filled" : ""} />
          ))}
        </div>
        <div className="controls minimal-controls">
          <button className="ctrl-btn ctrl-ghost" onClick={timer.reset} aria-label="Reset">
            {timer.status === "idle" ? <Square size={16} /> : <RotateCcw size={18} />}
          </button>
          <button
            className="ctrl-btn ctrl-primary"
            onClick={timer.status === "running" ? timer.pause : timer.start}
            aria-label={timer.status === "running" ? "Pause" : "Start"}
          >
            {timer.status === "running" ? <Pause size={26} /> : <Play size={26} />}
          </button>
          <button className="ctrl-btn ctrl-ghost" onClick={timer.skip} aria-label="Skip">
            <SkipForward size={18} />
          </button>
        </div>
      </section>
      {intervalEditorOpen ? (
        <IntervalPickerSheet
          focusMode={focusMode}
          workSeconds={timer.activePreset.workSeconds}
          restSeconds={timer.activePreset.restSeconds}
          onChange={applyCustomInterval}
          onClose={() => setIntervalEditorOpen(false)}
        />
      ) : null}
    </section>
  );
}

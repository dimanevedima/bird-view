import type { Dispatch, SetStateAction } from "react";
import { Pause, Play, RotateCcw, Settings, SkipForward, Square } from "lucide-react";
import { birdPresets, pixelPresets } from "../data/presets";
import { MotionLight } from "./MotionLight";
import type { AppState } from "../types";
import { getTodayStats } from "../utils/stats";
import { playSound } from "../utils/sound";
import { formatClock, formatDuration } from "../utils/time";

type TimerApi = ReturnType<typeof import("../hooks/useTimer").useTimer>;

type Props = {
  appState: AppState;
  onOpenSettings: () => void;
  setAppState: Dispatch<SetStateAction<AppState>>;
  timer: TimerApi;
};

export function TimerScreen({ appState, onOpenSettings, setAppState, timer }: Props) {
  const today = getTodayStats(appState.sessions);
  const focusMode = appState.settings.focusMode ?? "bird";
  const dots = Array.from({ length: 24 }, (_, index) => index < Math.round(timer.progress * 24));
  const modeLabel = timer.mode === "bird" ? "Work Pulse" : timer.mode === "empty" ? "Empty Space" : "Pixel View";
  const nextLabel = timer.mode === "empty" ? timer.activePreset.mode === "pixel" ? "Pixel View" : "Bird View" : "Empty Space";

  function toggleFocusMode() {
    const nextFocusMode = focusMode === "pixel" ? "bird" : "pixel";
    const nextPreset = nextFocusMode === "pixel" ? pixelPresets[0] : birdPresets[1];
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

  return (
    <section className={`timer-screen mode-${timer.mode} focus-${focusMode}`}>
      <MotionLight />
      <button className="pull-cord" onClick={toggleFocusMode} aria-label="Pull to switch Bird View and Pixel View">
        <span className="cord-line" />
        <span className="cord-handle" />
        <small>{focusMode === "pixel" ? "Pixel" : "Bird"}</small>
      </button>
      <section className="timer-ritual" aria-label="Timer">
        <p className="eyebrow">{focusMode === "pixel" ? "Pixel View" : "Bird View"}</p>
        <div className="clock" aria-live="polite">{formatClock(timer.remaining)}</div>
        <p className="mode-title">{modeLabel}</p>
        <div className="progress-dots" aria-label={`${Math.round(timer.progress * 100)} percent complete`}>
          {dots.map((active, index) => (
            <span key={index} className={active ? "filled" : ""} />
          ))}
        </div>
        <div className="next-phase">
          <span>Next: {nextLabel}</span>
          <strong>{formatClock(timer.mode === "empty" ? timer.activePreset.workSeconds : timer.activePreset.restSeconds)}</strong>
        </div>
        <div className="controls">
          <button className="primary-control" onClick={timer.status === "running" ? timer.pause : timer.start}>
            {timer.status === "running" ? <Pause size={20} /> : <Play size={20} />}
            {timer.status === "running" ? "Pause" : "Start"}
          </button>
          <button onClick={timer.skip}>
            <SkipForward size={20} />
            Skip
          </button>
          <button onClick={timer.reset}>
            {timer.status === "idle" ? <Square size={18} /> : <RotateCcw size={20} />}
            Reset
          </button>
          <button onClick={onOpenSettings}>
            <Settings size={19} />
            Edit
          </button>
        </div>
      </section>

      <section className="today-grid" aria-label="Today statistics">
        <Metric label="Today Focused" value={formatDuration(today.focusedSeconds)} unit="hrs" />
        <Metric label="Pulses" value={String(today.pulses)} unit="count" />
        <Metric label="Empty Spaces" value={String(today.emptySpaces)} unit="count" />
        <Metric label="Pixel Blocks" value={String(today.pixelBlocks)} unit="count" />
        <Metric label="Session" value={`${Math.max(1, today.sessions)} / 4`} unit="cycles" />
      </section>
    </section>
  );
}

function Metric({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{unit}</small>
    </div>
  );
}

import { ArrowLeft, ChevronLeft, ChevronRight, Trash2, Undo2, X } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { useMemo, useState } from "react";
import type { AppState, FocusSegment } from "../types";
import { formatWeekLabel, isSameDay, segmentsForDay, startOfWeek, weekDays } from "../utils/stats";

type Props = {
  appState: AppState;
  setAppState: Dispatch<SetStateAction<AppState>>;
  onBack: () => void;
};

const dayLabels = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function segmentLabel(mode: FocusSegment["mode"]) {
  if (mode === "empty") return "Empty Space";
  if (mode === "pixel") return "Pixel Block";
  return "Work Pulse";
}

function formatDuration(seconds: number) {
  if (seconds < 60) return `${seconds} sec`;
  return `${Math.round(seconds / 60)} min`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function StatsScreen({ appState, setAppState, onBack }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const weekStart = useMemo(() => {
    const start = startOfWeek(new Date());
    start.setDate(start.getDate() + weekOffset * 7);
    return start;
  }, [weekOffset]);
  const days = useMemo(() => weekDays(weekStart), [weekStart]);

  const visibleSegments = useMemo(
    () => appState.segments.filter((segment) => !pendingDeleteIds.includes(segment.id)),
    [appState.segments, pendingDeleteIds],
  );

  const daySegments = useMemo(() => days.map((day) => segmentsForDay(visibleSegments, day)), [days, visibleSegments]);

  function openDay(index: number) {
    setActiveDayIndex(index);
    setPendingDeleteIds([]);
  }

  function closeDay() {
    if (pendingDeleteIds.length) {
      setAppState((state) => ({
        ...state,
        segments: state.segments.filter((segment) => !pendingDeleteIds.includes(segment.id)),
      }));
    }
    setActiveDayIndex(null);
    setPendingDeleteIds([]);
  }

  function deleteSegment(id: string) {
    setPendingDeleteIds((ids) => [...ids, id]);
  }

  function undoDelete() {
    setPendingDeleteIds((ids) => ids.slice(0, -1));
  }

  const activeDay = activeDayIndex === null ? null : days[activeDayIndex];
  const activeSegments = activeDayIndex === null ? [] : daySegments[activeDayIndex];

  return (
    <section className="stats-screen">
      <button className="quiet-back" onClick={onBack} aria-label="Back to timer">
        <ArrowLeft size={18} />
      </button>
      <header className="week-nav">
        <button onClick={() => setWeekOffset((value) => value - 1)} aria-label="Previous week">
          <ChevronLeft size={18} />
        </button>
        <p className="week-label">{formatWeekLabel(weekStart, weekOffset)}</p>
        <button onClick={() => setWeekOffset((value) => Math.min(0, value + 1))} disabled={weekOffset === 0} aria-label="Next week">
          <ChevronRight size={18} />
        </button>
      </header>

      <div className="week-rows">
        {days.map((day, index) => {
          const focusSegments = daySegments[index].filter((segment) => segment.mode !== "empty");
          const isToday = isSameDay(day, new Date());
          return (
            <button key={index} className={isToday ? "day-row is-today" : "day-row"} onClick={() => openDay(index)}>
              <span className="day-name">{dayLabels[index]}</span>
              <span className="day-squares">
                {focusSegments.length === 0 ? (
                  <i className="square-empty" />
                ) : (
                  focusSegments.map((segment) => <i key={segment.id} className={`square-${segment.mode}`} />)
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="week-legend">
        <span>
          <i className="square-bird" />
          Bird
        </span>
        <span>
          <i className="square-pixel" />
          Pixel
        </span>
      </div>

      {activeDay ? (
        <div className="day-sheet-scrim" role="dialog" aria-modal="true" aria-label={`${dayLabels[activeDayIndex!]} segments`}>
          <section className="day-sheet">
            <header className="day-sheet-header">
              <p className="section-title">
                {dayLabels[activeDayIndex!]} · {activeDay.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </p>
              <button className="icon-button" onClick={closeDay} aria-label="Close">
                <X size={20} />
              </button>
            </header>

            <div className="day-segment-list">
              {activeSegments.length === 0 ? (
                <p className="subtle day-empty">No segments this day.</p>
              ) : (
                activeSegments.map((segment) => (
                  <div key={segment.id} className="day-segment-row">
                    <i className={`square-${segment.mode}`} />
                    <span className="segment-time">{formatTime(segment.startedAt)}</span>
                    <span className="segment-label">{segmentLabel(segment.mode)}</span>
                    <span className="segment-duration">{formatDuration(segment.durationSeconds)}</span>
                    <button onClick={() => deleteSegment(segment.id)} aria-label="Delete segment" className="segment-delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {pendingDeleteIds.length ? (
              <div className="undo-bar">
                <span>{pendingDeleteIds.length} removed</span>
                <button onClick={undoDelete}>
                  <Undo2 size={14} />
                  Undo
                </button>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
}

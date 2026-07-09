import { Check } from "lucide-react";
import { useState } from "react";
import { DurationDial } from "./DurationDial";
import type { WorkProfile } from "../types";

type Segment = "work" | "rest";
type RestUnit = "sec" | "min";

type Props = {
  focusMode: WorkProfile;
  workSeconds: number;
  restSeconds: number;
  onChange: (workSeconds: number, restSeconds: number) => void;
  onClose: () => void;
};

const RANGES: Record<WorkProfile, { work: { min: number; max: number; step: number }; rest: { min: number; max: number; step: number; unit: RestUnit } }> = {
  bird: {
    work: { min: 1, max: 30, step: 1 },
    rest: { min: 10, max: 180, step: 5, unit: "sec" },
  },
  pixel: {
    work: { min: 15, max: 180, step: 5 },
    rest: { min: 5, max: 30, step: 1, unit: "min" },
  },
};

export function IntervalPickerSheet({ focusMode, workSeconds, restSeconds, onChange, onClose }: Props) {
  const [segment, setSegment] = useState<Segment>("work");
  const ranges = RANGES[focusMode];
  const workMinutes = Math.round(workSeconds / 60);
  const restUnit = ranges.rest.unit;
  const restDisplay = restUnit === "min" ? Math.round(restSeconds / 60) : restSeconds;

  function setWorkMinutes(nextMinutes: number) {
    onChange(nextMinutes * 60, restSeconds);
  }

  function setRestDisplay(nextValue: number) {
    onChange(workSeconds, restUnit === "min" ? nextValue * 60 : nextValue);
  }

  return (
    <div className="dial-scrim" role="dialog" aria-modal="true" aria-label="Edit interval">
      <section className="dial-sheet">
        <header className="dial-sheet-header">
          <div className="segment-tabs" role="tablist" aria-label="Segment">
            <button role="tab" aria-selected={segment === "work"} className={segment === "work" ? "active" : ""} onClick={() => setSegment("work")}>
              Work
            </button>
            <button role="tab" aria-selected={segment === "rest"} className={segment === "rest" ? "active" : ""} onClick={() => setSegment("rest")}>
              Rest
            </button>
          </div>
          <button className="icon-button confirm" onClick={onClose} aria-label="Done">
            <Check size={20} />
          </button>
        </header>

        <div className="dial-stage">
          {segment === "work" ? (
            <DurationDial key="work" value={workMinutes} min={ranges.work.min} max={ranges.work.max} step={ranges.work.step} unitLabel="min" onChange={setWorkMinutes} />
          ) : (
            <DurationDial key="rest" value={restDisplay} min={ranges.rest.min} max={ranges.rest.max} step={ranges.rest.step} unitLabel={restUnit} onChange={setRestDisplay} />
          )}
        </div>

        <p className="dial-hint">{segment === "work" ? "Focus length" : "Empty space length"}</p>
      </section>
    </div>
  );
}

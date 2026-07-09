import { useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";

const START_ANGLE = -135;
const END_ANGLE = 135;
const SWEEP = END_ANGLE - START_ANGLE;
const SIZE = 240;
const CENTER = SIZE / 2;
const RADIUS = 96;

type Props = {
  value: number;
  min: number;
  max: number;
  step: number;
  unitLabel: string;
  formatValue?: (value: number) => string;
  onChange: (value: number) => void;
};

function pointAt(deg: number, radius: number) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: CENTER + radius * Math.sin(rad),
    y: CENTER - radius * Math.cos(rad),
  };
}

function arcPath(fromDeg: number, toDeg: number, radius: number) {
  const start = pointAt(fromDeg, radius);
  const end = pointAt(toDeg, radius);
  const largeArc = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function angleForValue(value: number, min: number, max: number) {
  const fraction = max === min ? 0 : (value - min) / (max - min);
  return START_ANGLE + fraction * SWEEP;
}

function valueForAngle(deg: number, min: number, max: number, step: number) {
  const clamped = Math.min(END_ANGLE, Math.max(START_ANGLE, deg));
  const fraction = (clamped - START_ANGLE) / SWEEP;
  const raw = min + fraction * (max - min);
  const snapped = Math.round(raw / step) * step;
  return Math.min(max, Math.max(min, snapped));
}

const MAJOR_FRACTIONS = [0, 0.25, 0.5, 0.75, 1];
const MINOR_TICK_COUNT = 27;

export function DurationDial({ value, min, max, step, unitLabel, formatValue, onChange }: Props) {
  const dialRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const angle = angleForValue(value, min, max);
  const display = (formatValue ?? String)(Math.round(value));

  function updateFromPointer(clientX: number, clientY: number) {
    const dial = dialRef.current;
    if (!dial) return;
    const rect = dial.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
    onChange(valueForAngle(deg, min, max, step));
  }

  function handleDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    updateFromPointer(event.clientX, event.clientY);
  }

  function handleMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    updateFromPointer(event.clientX, event.clientY);
  }

  function handleUp() {
    setDragging(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange(Math.min(max, value + step));
    } else if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      onChange(Math.max(min, value - step));
    }
  }

  const majorTicks = MAJOR_FRACTIONS.map((fraction) => {
    const deg = START_ANGLE + fraction * SWEEP;
    const tickValue = min + fraction * (max - min);
    const pos = pointAt(deg, RADIUS + 24);
    return { deg, pos, label: (formatValue ?? String)(Math.round(tickValue)) };
  });

  const minorTicks = Array.from({ length: MINOR_TICK_COUNT }, (_, index) => START_ANGLE + (index * SWEEP) / (MINOR_TICK_COUNT - 1));
  const handlePos = pointAt(angle, RADIUS);

  return (
    <div
      ref={dialRef}
      className={dragging ? "duration-dial is-dragging" : "duration-dial"}
      onPointerDown={handleDown}
      onPointerMove={handleMove}
      onPointerUp={handleUp}
      onPointerCancel={handleUp}
      onKeyDown={handleKeyDown}
      role="slider"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-label={unitLabel}
      tabIndex={0}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%">
        <path className="dial-track" d={arcPath(START_ANGLE, END_ANGLE, RADIUS)} />
        <path className="dial-progress" d={arcPath(START_ANGLE, angle, RADIUS)} />
        {minorTicks.map((deg, index) => {
          const inner = pointAt(deg, RADIUS - 9);
          const outer = pointAt(deg, RADIUS - 1);
          return <line key={index} className="dial-tick" x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} />;
        })}
        <circle className="dial-handle" cx={handlePos.x} cy={handlePos.y} r={7} />
      </svg>
      {majorTicks.map((tick, index) => (
        <span
          key={index}
          className="dial-tick-label"
          style={{ left: `${(tick.pos.x / SIZE) * 100}%`, top: `${(tick.pos.y / SIZE) * 100}%` }}
        >
          {tick.label}
        </span>
      ))}
      <div className="dial-center">
        <strong>{display}</strong>
        <small>{unitLabel}</small>
      </div>
    </div>
  );
}

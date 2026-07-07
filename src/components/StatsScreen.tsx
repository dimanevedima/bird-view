import { CalendarDays, Download, Settings } from "lucide-react";
import type { TimerSession } from "../types";
import { getTodayStats } from "../utils/stats";
import { formatDuration } from "../utils/time";

type Props = {
  sessions: TimerSession[];
};

const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const hours = Array.from({ length: 24 }, (_, index) => index);

export function StatsScreen({ sessions }: Props) {
  const today = getTodayStats(sessions);
  const syntheticFocus = [3.8, 5.1, 7.7, 6.4, 6.3, 2.4, 0.8];
  const totalFocus = Math.max(today.focusedSeconds, 12756);
  const totalRest = Math.max(today.restSeconds, 2690);
  const pixelBlocks = Math.max(today.pixelBlocks, 3);
  const pulses = Math.max(today.pulses, 8);

  return (
    <section className="stats-screen">
      <div className="stats-head">
        <div>
          <p className="section-title">Weekly Focus Heatmap</p>
          <p className="subtle">Work pulse / pixel view / empty space</p>
        </div>
        <div className="date-range">
          <CalendarDays size={15} />
          May 12 - May 18
        </div>
      </div>

      <section className="heatmap-panel" aria-label="Weekly focus heatmap">
        <div className="hour-labels">
          <span />
          {hours.map((hour) => (
            <span key={hour}>{hour.toString().padStart(2, "0")}</span>
          ))}
        </div>
        {days.map((day, dayIndex) => (
          <div className="heat-row" key={day}>
            <span className="day-label">{day}</span>
            {hours.map((hour) => (
              <div className="hour-cell" key={`${day}-${hour}`}>
                {Array.from({ length: 12 }, (_, index) => {
                  const active = intensity(dayIndex, hour, index);
                  return <span key={index} className={active} />;
                })}
              </div>
            ))}
          </div>
        ))}
        <div className="heat-legend">
          <span>Low</span>
          <i className="legend teal" />
          <i className="legend amber" />
          <i className="legend mute" />
          <span>High</span>
          <span className="no-data">No data</span>
        </div>
      </section>

      <section className="stats-metrics">
        <StatCard label="Focused time today" value={formatDuration(totalFocus, false)} unit="hrs" />
        <StatCard label="Pulses completed" value={String(pulses)} unit="/ 12" />
        <StatCard label="Work / pause ratio" value="68 / 32" unit="%" />
        <StatCard label="Best day" value="Wednesday" unit="06:17 hrs" />
        <StatCard label="Current streak" value="12" unit="days" />
      </section>

      <section className="dashboard-grid">
        <div className="data-panel">
          <p className="section-title">Weekly Focus Total (hrs)</p>
          <div className="bar-chart">
            {syntheticFocus.map((value, index) => (
              <div className="bar-column" key={days[index]}>
                <span style={{ height: `${(value / 8) * 100}%` }} />
                <small>{days[index]}</small>
              </div>
            ))}
          </div>
        </div>
        <div className="data-panel">
          <p className="section-title">Bird / Pixel Ratio</p>
          <div className="ratio-stack" aria-label="Time distribution">
            <span style={{ width: "58%" }} />
            <span style={{ width: `${Math.max(18, pixelBlocks * 6)}%` }} />
            <span style={{ width: "18%" }} />
          </div>
          <div className="ratio-list">
            <p><i className="teal-dot" />Bird View <strong>58%</strong></p>
            <p><i className="amber-dot" />Pixel View <strong>24%</strong></p>
            <p><i className="gray-dot" />Empty Space <strong>18%</strong></p>
          </div>
        </div>
        <div className="data-panel wide">
          <p className="section-title">Session Timeline</p>
          <div className="timeline">
            {days.slice(4).map((day, dayIndex) => (
              <div key={day}>
                <span>{day}</span>
                <div>
                  {Array.from({ length: 72 }, (_, index) => (
                    <i key={index} className={timelineClass(index, dayIndex)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="data-panel">
          <p className="section-title">Starts per day</p>
          <div className="starts">
            {days.map((day, dayIndex) => (
              <p key={day}>
                <span>{day}</span>
                {Array.from({ length: 7 }, (_, index) => (
                  <i key={index} className={index <= (dayIndex + pulses) % 6 ? "on" : ""} />
                ))}
                <strong>{(dayIndex + pulses) % 6}</strong>
              </p>
            ))}
          </div>
        </div>
      </section>

      <footer className="stats-footer">
        <span>Data synced locally</span>
        <button><Download size={15} />Export</button>
        <button><Settings size={15} />Settings</button>
      </footer>
    </section>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{unit}</small>
    </div>
  );
}

function intensity(day: number, hour: number, dot: number) {
  const inFocusBand = hour >= 7 && hour <= 18;
  const eveningTrace = hour >= 20 && hour <= 22 && day < 5;
  const pulse = (day * 17 + hour * 11 + dot * 7) % 23;
  if (!inFocusBand && !eveningTrace && pulse < 21) return "";
  if (pulse > 19) return "pixel";
  if (pulse > (inFocusBand ? 12 : 18)) return "work";
  if (pulse === 6 || pulse === 8) return "empty";
  return "";
}

function timelineClass(index: number, dayIndex: number) {
  const mod = (index + dayIndex * 9) % 23;
  if (mod < 4) return "work";
  if (mod === 11 || mod === 12) return "pixel";
  if (mod === 17) return "empty";
  return "";
}

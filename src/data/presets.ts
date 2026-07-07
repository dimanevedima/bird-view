import type { TimerPreset } from "../types";

export const presets: TimerPreset[] = [
  { id: "3-30", label: "3 / 30", workSeconds: 180, restSeconds: 30, mode: "bird" },
  { id: "5-45", label: "5 / 45", workSeconds: 300, restSeconds: 45, mode: "bird" },
  { id: "7-60", label: "7 / 60", workSeconds: 420, restSeconds: 60, mode: "bird" },
  { id: "15-2", label: "15 / 2", workSeconds: 900, restSeconds: 120, mode: "bird" },
  { id: "25-5", label: "25 / 5", workSeconds: 1500, restSeconds: 300, mode: "pixel" },
];

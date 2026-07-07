import type { TimerPreset } from "../types";

export const presets: TimerPreset[] = [
  { id: "3-30", label: "3 / 30", workSeconds: 180, restSeconds: 30, mode: "bird" },
  { id: "5-45", label: "5 / 45", workSeconds: 300, restSeconds: 45, mode: "bird" },
  { id: "7-60", label: "7 / 60", workSeconds: 420, restSeconds: 60, mode: "bird" },
  { id: "15-2", label: "15 / 2", workSeconds: 900, restSeconds: 120, mode: "bird" },
  { id: "45-10", label: "45 / 10", workSeconds: 2700, restSeconds: 600, mode: "pixel" },
  { id: "60-10", label: "60 / 10", workSeconds: 3600, restSeconds: 600, mode: "pixel" },
  { id: "90-15", label: "90 / 15", workSeconds: 5400, restSeconds: 900, mode: "pixel" },
  { id: "120-20", label: "120 / 20", workSeconds: 7200, restSeconds: 1200, mode: "pixel" },
];

export const birdPresets = presets.filter((preset) => preset.mode === "bird");
export const pixelPresets = presets.filter((preset) => preset.mode === "pixel");

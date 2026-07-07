export type TimerMode = "bird" | "empty" | "pixel";
export type TimerStatus = "idle" | "running" | "paused";

export type TimerPreset = {
  id: string;
  label: string;
  workSeconds: number;
  restSeconds: number;
  mode: "bird" | "pixel";
};

export type TimerSettings = {
  activePresetId: string;
  soundEnabled: boolean;
};

export type TimerSession = {
  id: string;
  startedAt: string;
  endedAt?: string;
  task?: string;
  workSecondsCompleted: number;
  restSecondsCompleted: number;
  birdPulsesCompleted: number;
  emptySpacesCompleted: number;
  pixelBlocksCompleted: number;
};

export type AppState = {
  settings: TimerSettings;
  currentTask: string;
  sessions: TimerSession[];
};

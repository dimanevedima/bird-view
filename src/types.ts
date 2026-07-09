export type TimerMode = "bird" | "empty" | "pixel";
export type TimerStatus = "idle" | "running" | "paused";
export type WorkProfile = "bird" | "pixel";
export type SoundId = "soft" | "wood" | "glass" | "tape";

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
  soundId: SoundId;
  focusMode: WorkProfile;
  notificationsEnabled: boolean;
};

export type TimerRuntime = {
  presetId: string;
  mode: TimerMode;
  status: TimerStatus;
  remaining: number;
  updatedAt: number;
  sessionId: string | null;
};

export type TimerSession = {
  id: string;
  startedAt: string;
  endedAt?: string;
  task?: string;
};

export type FocusSegment = {
  id: string;
  sessionId: string;
  mode: TimerMode;
  startedAt: string;
  durationSeconds: number;
};

export type AppState = {
  settings: TimerSettings;
  currentTask: string;
  sessions: TimerSession[];
  segments: FocusSegment[];
  customPresets: TimerPreset[];
};

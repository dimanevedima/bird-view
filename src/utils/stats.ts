import type { TimerSession } from "../types";
import { isToday } from "./time";

export function getTodayStats(sessions: TimerSession[]) {
  const today = sessions.filter((session) => isToday(session.startedAt));
  return {
    focusedSeconds: today.reduce((sum, session) => sum + session.workSecondsCompleted, 0),
    restSeconds: today.reduce((sum, session) => sum + session.restSecondsCompleted, 0),
    pulses: today.reduce((sum, session) => sum + session.birdPulsesCompleted, 0),
    emptySpaces: today.reduce((sum, session) => sum + session.emptySpacesCompleted, 0),
    pixelBlocks: today.reduce((sum, session) => sum + session.pixelBlocksCompleted, 0),
    sessions: today.length,
  };
}

export function formatClock(totalSeconds: number) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

export function formatDuration(totalSeconds: number, withSeconds = true) {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  if (!withSeconds) return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function isToday(dateIso: string) {
  const date = new Date(dateIso);
  const now = new Date();
  return date.toDateString() === now.toDateString();
}

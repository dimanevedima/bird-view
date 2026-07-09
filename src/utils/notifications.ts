import type { TimerMode } from "../types";

function supported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!supported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!supported()) return "unsupported" as const;
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}

async function send(title: string, body: string) {
  if (!supported() || Notification.permission !== "granted") return;
  const icon = `${import.meta.env.BASE_URL}icon.svg`;
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) {
      await registration.showNotification(title, { body, icon, tag: "bird-view-phase" });
      return;
    }
  } catch {
    // fall through to the direct constructor below
  }
  try {
    new Notification(title, { body, icon });
  } catch {
    // some environments (e.g. non-installed PWA) block the direct constructor — nothing more we can do
  }
}

function phaseLabel(mode: TimerMode) {
  if (mode === "empty") return "Empty Space";
  if (mode === "pixel") return "Pixel Block";
  return "Work Pulse";
}

export function notifyPhaseComplete(justEnded: TimerMode, nextMode: TimerMode) {
  const title = justEnded === "empty" ? "Empty space finished" : "Focus pulse finished";
  void send(title, `Next up: ${phaseLabel(nextMode)}`);
}

export function notifyCatchUp(workCount: number, nextMode: TimerMode) {
  if (!workCount) return;
  const label = `${workCount} focus block${workCount > 1 ? "s" : ""}`;
  void send("While you were away", `${label} finished. Next: ${phaseLabel(nextMode)}`);
}

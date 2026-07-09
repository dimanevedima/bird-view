import NoSleep from "nosleep.js";

let noSleep: NoSleep | null = null;
let shouldKeepAwake = false;

function getNoSleep() {
  noSleep ??= new NoSleep();
  return noSleep;
}

export function startDisplayKeepAwake() {
  shouldKeepAwake = true;
  try {
    void getNoSleep().enable().catch(() => undefined);
  } catch {
    // Screen wake is best-effort and depends on browser support/user gesture.
  }
}

export function stopDisplayKeepAwake() {
  shouldKeepAwake = false;
  try {
    getNoSleep().disable();
  } catch {
    // ignore
  }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && shouldKeepAwake) {
    startDisplayKeepAwake();
  }
});

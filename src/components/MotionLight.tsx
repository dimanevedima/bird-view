import { useEffect, useRef, useState } from "react";

type OrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

const canUseMotion = typeof window !== "undefined" && "DeviceOrientationEvent" in window;

function setLightVars(x: number, y: number, tiltX: number, tiltY: number) {
  document.documentElement.style.setProperty("--lamp-x", `${x}%`);
  document.documentElement.style.setProperty("--lamp-y", `${y}%`);
  document.documentElement.style.setProperty("--tilt-x", `${tiltX}deg`);
  document.documentElement.style.setProperty("--tilt-y", `${tiltY}deg`);
  document.documentElement.style.setProperty("--beam-angle", `${tiltX * 0.45}deg`);
}

export function MotionLight() {
  const [motionActive, setMotionActive] = useState(false);
  const [canAskMotion, setCanAskMotion] = useState(false);
  const smooth = useRef({ x: 50, y: 15, tiltX: 0, tiltY: 0 });

  useEffect(() => {
    const MotionEvent = DeviceOrientationEvent as OrientationEventWithPermission;
    const isTouchDevice = navigator.maxTouchPoints > 0;
    setCanAskMotion(canUseMotion && isTouchDevice && typeof MotionEvent.requestPermission === "function");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    function onPointerMove(event: PointerEvent) {
      if (motionActive) return;
      const nextX = 50 + ((event.clientX / window.innerWidth) - 0.5) * 9;
      const nextY = 15 + ((event.clientY / window.innerHeight) - 0.32) * 5;
      const nextTiltX = ((event.clientX / window.innerWidth) - 0.5) * 3;
      const nextTiltY = -((event.clientY / window.innerHeight) - 0.45) * 2;
      smooth.current = {
        x: smooth.current.x * 0.9 + nextX * 0.1,
        y: smooth.current.y * 0.9 + nextY * 0.1,
        tiltX: smooth.current.tiltX * 0.88 + nextTiltX * 0.12,
        tiltY: smooth.current.tiltY * 0.88 + nextTiltY * 0.12,
      };
      setLightVars(smooth.current.x, smooth.current.y, smooth.current.tiltX, smooth.current.tiltY);
    }

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, [motionActive]);

  useEffect(() => {
    if (!motionActive) return;

    function onOrientation(event: DeviceOrientationEvent) {
      const beta = Math.max(-28, Math.min(28, event.beta ?? 0));
      const gamma = Math.max(-24, Math.min(24, event.gamma ?? 0));
      const nextX = 50 + gamma * 0.42;
      const nextY = 15 + beta * 0.1;
      const nextTiltX = gamma * 0.12;
      const nextTiltY = -beta * 0.055;
      smooth.current = {
        x: smooth.current.x * 0.86 + nextX * 0.14,
        y: smooth.current.y * 0.86 + nextY * 0.14,
        tiltX: smooth.current.tiltX * 0.82 + nextTiltX * 0.18,
        tiltY: smooth.current.tiltY * 0.82 + nextTiltY * 0.18,
      };
      setLightVars(smooth.current.x, smooth.current.y, smooth.current.tiltX, smooth.current.tiltY);
    }

    window.addEventListener("deviceorientation", onOrientation, true);
    return () => window.removeEventListener("deviceorientation", onOrientation, true);
  }, [motionActive]);

  async function enableMotion() {
    const MotionEvent = DeviceOrientationEvent as OrientationEventWithPermission;
    if (typeof MotionEvent.requestPermission === "function") {
      const permission = await MotionEvent.requestPermission();
      setMotionActive(permission === "granted");
      setCanAskMotion(permission !== "granted");
      return;
    }
    setMotionActive(canUseMotion);
    setCanAskMotion(false);
  }

  return (
    <div className="motion-light">
      <div className="lamp-rig" aria-hidden="true">
        <span className="lamp-cable" />
        <span className="lamp-cap" />
        <span className="lamp-glow" />
      </div>
      <div className="light-cone" aria-hidden="true" />
      <div className="light-dust" aria-hidden="true" />
      {canAskMotion ? (
        <button className="motion-permission" type="button" onClick={enableMotion} aria-label="Enable motion light">
          Motion light
        </button>
      ) : null}
    </div>
  );
}

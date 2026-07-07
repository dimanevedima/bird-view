import { useEffect, useRef, useState } from "react";

type OrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "portrait" | "portrait-primary") => Promise<void>;
};

const canUseMotion = typeof window !== "undefined" && "DeviceOrientationEvent" in window;

function setLightVars(x: number, y: number, tiltX: number, tiltY: number, pendulum: number) {
  document.documentElement.style.setProperty("--lamp-x", `${x}%`);
  document.documentElement.style.setProperty("--lamp-y", `${y}%`);
  document.documentElement.style.setProperty("--tilt-x", `${tiltX}deg`);
  document.documentElement.style.setProperty("--tilt-y", `${tiltY}deg`);
  document.documentElement.style.setProperty("--beam-angle", `${pendulum * 0.72}deg`);
  document.documentElement.style.setProperty("--pendulum-angle", `${pendulum}deg`);
}

export function MotionLight() {
  const [motionActive, setMotionActive] = useState(false);
  const askedMotion = useRef(false);
  const smooth = useRef({ x: 50, y: 15, tiltX: 0, tiltY: 0, pendulum: 0 });

  useEffect(() => {
    const MotionEvent = DeviceOrientationEvent as OrientationEventWithPermission;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    async function askMotionFromGesture() {
      if (askedMotion.current || !canUseMotion) return;
      askedMotion.current = true;
      try {
        const orientation = screen.orientation as LockableOrientation;
        await orientation.lock?.("portrait").catch(() => undefined);
        if (typeof MotionEvent.requestPermission === "function") {
          const permission = await MotionEvent.requestPermission();
          setMotionActive(permission === "granted");
          return;
        }
        setMotionActive(true);
      } catch {
        setMotionActive(false);
      }
    }

    function onPointerMove(event: PointerEvent) {
      if (motionActive) return;
      const nextX = 50 + ((event.clientX / window.innerWidth) - 0.5) * 9;
      const nextY = 15 + ((event.clientY / window.innerHeight) - 0.32) * 5;
      const nextTiltX = ((event.clientX / window.innerWidth) - 0.5) * 3;
      const nextTiltY = -((event.clientY / window.innerHeight) - 0.45) * 2;
      const nextPendulum = ((event.clientX / window.innerWidth) - 0.5) * 4;
      smooth.current = {
        x: smooth.current.x * 0.9 + nextX * 0.1,
        y: smooth.current.y * 0.9 + nextY * 0.1,
        tiltX: smooth.current.tiltX * 0.88 + nextTiltX * 0.12,
        tiltY: smooth.current.tiltY * 0.88 + nextTiltY * 0.12,
        pendulum: smooth.current.pendulum * 0.9 + nextPendulum * 0.1,
      };
      setLightVars(smooth.current.x, smooth.current.y, smooth.current.tiltX, smooth.current.tiltY, smooth.current.pendulum);
    }

    window.addEventListener("pointerdown", askMotionFromGesture, { once: true, passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", askMotionFromGesture);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [motionActive]);

  useEffect(() => {
    if (!motionActive) return;

    function onOrientation(event: DeviceOrientationEvent) {
      const beta = Math.max(-28, Math.min(28, event.beta ?? 0));
      const gamma = Math.max(-24, Math.min(24, event.gamma ?? 0));
      const nextPendulum = gamma * 0.34 + beta * 0.035;
      const nextX = 50 + Math.sin((nextPendulum * Math.PI) / 180) * 7;
      const nextY = 15 + Math.abs(nextPendulum) * 0.045;
      const nextTiltX = gamma * 0.07;
      const nextTiltY = -beta * 0.055;
      smooth.current = {
        x: smooth.current.x * 0.9 + nextX * 0.1,
        y: smooth.current.y * 0.9 + nextY * 0.1,
        tiltX: smooth.current.tiltX * 0.88 + nextTiltX * 0.12,
        tiltY: smooth.current.tiltY * 0.88 + nextTiltY * 0.12,
        pendulum: smooth.current.pendulum * 0.78 + nextPendulum * 0.22,
      };
      setLightVars(smooth.current.x, smooth.current.y, smooth.current.tiltX, smooth.current.tiltY, smooth.current.pendulum);
    }

    window.addEventListener("deviceorientation", onOrientation, true);
    return () => window.removeEventListener("deviceorientation", onOrientation, true);
  }, [motionActive]);

  return (
    <div className="motion-light">
      <div className="lamp-rig" aria-hidden="true">
        <span className="lamp-cable" />
        <span className="lamp-cap" />
        <span className="lamp-glow" />
      </div>
      <div className="light-cone" aria-hidden="true" />
      <div className="light-dust" aria-hidden="true" />
    </div>
  );
}

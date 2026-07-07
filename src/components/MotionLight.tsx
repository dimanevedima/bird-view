import { useEffect, useRef, useState } from "react";

type OrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

type MotionEventWithPermission = typeof DeviceMotionEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "portrait" | "portrait-primary") => Promise<void>;
};

const canUseMotion = typeof window !== "undefined" && "DeviceOrientationEvent" in window;
const canUseDeviceMotion = typeof window !== "undefined" && "DeviceMotionEvent" in window;

function setLightVars(angle: number, tiltX: number, tiltY: number) {
  const radians = (angle * Math.PI) / 180;
  const x = 50 + Math.sin(radians) * 28;
  const drop = (1 - Math.cos(radians)) * 150;
  document.documentElement.style.setProperty("--lamp-x", `${x}%`);
  document.documentElement.style.setProperty("--lamp-drop", `${drop}px`);
  document.documentElement.style.setProperty("--tilt-x", `${tiltX}deg`);
  document.documentElement.style.setProperty("--tilt-y", `${tiltY}deg`);
  document.documentElement.style.setProperty("--beam-angle", `${angle * 0.86}deg`);
  document.documentElement.style.setProperty("--lamp-angle", `${angle}deg`);
}

export function MotionLight() {
  const [motionActive, setMotionActive] = useState(false);
  const askedMotion = useRef(false);
  const target = useRef({ angle: 0, tiltX: 0, tiltY: 0 });
  const physics = useRef({ angle: 0, velocity: 0, tiltX: 0, tiltY: 0 });

  useEffect(() => {
    const MotionEvent = DeviceOrientationEvent as OrientationEventWithPermission;
    const DeviceMotion = DeviceMotionEvent as MotionEventWithPermission;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    async function askMotionFromGesture() {
      if (askedMotion.current || !canUseMotion) return;
      askedMotion.current = true;
      try {
        const orientation = screen.orientation as LockableOrientation;
        await orientation.lock?.("portrait").catch(() => undefined);
        const orientationPermission = typeof MotionEvent.requestPermission === "function"
          ? await MotionEvent.requestPermission()
          : "granted";
        const motionPermission = typeof DeviceMotion.requestPermission === "function"
          ? await DeviceMotion.requestPermission()
          : "granted";
        if (orientationPermission === "granted" || motionPermission === "granted") {
          setMotionActive(true);
          return;
        }
        setMotionActive(false);
      } catch {
        setMotionActive(false);
      }
    }

    function onPointerMove(event: PointerEvent) {
      if (motionActive) return;
      target.current = {
        angle: ((event.clientX / window.innerWidth) - 0.5) * 24,
        tiltX: ((event.clientX / window.innerWidth) - 0.5) * 3.4,
        tiltY: -((event.clientY / window.innerHeight) - 0.45) * 2.4,
      };
    }

    window.addEventListener("pointerdown", askMotionFromGesture, { once: true, passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", askMotionFromGesture);
      window.removeEventListener("pointermove", onPointerMove);
    };
  }, [motionActive]);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    let frameId = 0;
    const startedAt = performance.now();

    function tick(now: number) {
      if (!motionActive) {
        target.current.angle += (Math.sin((now - startedAt) / 1450) * 7.4 - target.current.angle) * 0.018;
      }
      const state = physics.current;
      const pull = (target.current.angle - state.angle) * 0.086;
      state.velocity = (state.velocity + pull) * 0.885;
      state.angle += state.velocity;
      state.tiltX += (target.current.tiltX - state.tiltX) * 0.08;
      state.tiltY += (target.current.tiltY - state.tiltY) * 0.08;
      setLightVars(state.angle, state.tiltX, state.tiltY);
      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [motionActive]);

  useEffect(() => {
    if (!motionActive) return;

    function onOrientation(event: DeviceOrientationEvent) {
      const beta = Math.max(-28, Math.min(28, event.beta ?? 0));
      const gamma = Math.max(-24, Math.min(24, event.gamma ?? 0));
      target.current = {
        angle: Math.max(-24, Math.min(24, gamma * 1.25 + beta * 0.09)),
        tiltX: gamma * 0.09,
        tiltY: -beta * 0.06,
      };
    }

    function onMotion(event: DeviceMotionEvent) {
      const gravityX = event.accelerationIncludingGravity?.x ?? 0;
      const accelerationX = event.acceleration?.x ?? 0;
      const shake = Math.max(-10, Math.min(10, gravityX * 2.1 + accelerationX * 5));
      target.current.angle = Math.max(-26, Math.min(26, target.current.angle + shake * 0.55));
    }

    window.addEventListener("deviceorientation", onOrientation, true);
    window.addEventListener("devicemotion", onMotion, true);
    return () => {
      window.removeEventListener("deviceorientation", onOrientation, true);
      window.removeEventListener("devicemotion", onMotion, true);
    };
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

import { useEffect, useRef } from "react";

function setLightVars(angle: number, tiltX: number, tiltY: number) {
  const radians = (angle * Math.PI) / 180;
  const swingX = Math.sin(radians) * 54;
  const drop = (1 - Math.cos(radians)) * 150;
  document.documentElement.style.setProperty("--lamp-swing-x", `${swingX}px`);
  document.documentElement.style.setProperty("--lamp-drop", `${drop}px`);
  document.documentElement.style.setProperty("--tilt-x", `${tiltX}deg`);
  document.documentElement.style.setProperty("--tilt-y", `${tiltY}deg`);
  document.documentElement.style.setProperty("--lamp-angle", `${angle}deg`);
}

function nextSwing() {
  return {
    amplitude: 5.8 + Math.random() * 5.2,
    period: 1750 + Math.random() * 1900,
    phase: Math.random() * Math.PI * 2,
    drift: (Math.random() - 0.5) * 3.5,
    until: performance.now() + 2600 + Math.random() * 4200,
  };
}

export function MotionLight() {
  const target = useRef({ angle: 0, tiltX: 0, tiltY: 0 });
  const physics = useRef({ angle: 0, velocity: 0, tiltX: 0, tiltY: 0 });
  const swing = useRef(nextSwing());
  const lastWriteAt = useRef(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    let frameId = 0;
    const startedAt = performance.now();

    function tick(now: number) {
      if (now > swing.current.until) {
        swing.current = nextSwing();
      }

      const seconds = now - startedAt;
      const currentSwing = swing.current;
      const slowArc = Math.sin(seconds / currentSwing.period + currentSwing.phase) * currentSwing.amplitude;
      const smallUnevenness = Math.sin(seconds / (currentSwing.period * 0.43) + currentSwing.phase * 0.7) * 1.2;
      const breathingTilt = Math.cos(seconds / (currentSwing.period * 1.15)) * 0.65;

      target.current = {
        angle: slowArc + smallUnevenness + currentSwing.drift,
        tiltX: (slowArc + currentSwing.drift) * 0.055,
        tiltY: breathingTilt,
      };

      const state = physics.current;
      const pull = (target.current.angle - state.angle) * 0.075;
      state.velocity = (state.velocity + pull) * 0.925;
      state.angle += state.velocity;
      state.tiltX += (target.current.tiltX - state.tiltX) * 0.055;
      state.tiltY += (target.current.tiltY - state.tiltY) * 0.055;

      if (now - lastWriteAt.current > 32) {
        lastWriteAt.current = now;
        setLightVars(state.angle, state.tiltX, state.tiltY);
      }

      frameId = requestAnimationFrame(tick);
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <div className="motion-light">
      <div className="lamp-rig" aria-hidden="true">
        <span className="lamp-cable" />
        <span className="lamp-cap" />
        <span className="lamp-glow" />
        <span className="light-cone" />
      </div>
      <div className="light-dust" aria-hidden="true" />
    </div>
  );
}

import { useEffect, useRef } from "react";

function nextSwing() {
  const isPhone = window.innerWidth < 720;
  const angle = (isPhone ? 3.8 : 4.8) + Math.random() * (isPhone ? 3.1 : 4.4);
  return {
    angle,
    duration: 3900 + Math.random() * 2800,
    x: (isPhone ? 22 : 36) + angle * (isPhone ? 1.8 : 2.2),
    drop: 2 + angle * 0.26,
    delay: -Math.random() * 2400,
  };
}

export function MotionLight() {
  const rigRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.documentElement.style.setProperty("--tilt-x", "0deg");
    document.documentElement.style.setProperty("--tilt-y", "0deg");

    function applySwing(withDelay = false) {
      const rig = rigRef.current;
      if (!rig) return;
      const swing = nextSwing();
      rig.style.setProperty("--swing-angle", `${swing.angle.toFixed(2)}deg`);
      rig.style.setProperty("--swing-duration", `${Math.round(swing.duration)}ms`);
      rig.style.setProperty("--swing-x", `${Math.round(swing.x)}px`);
      rig.style.setProperty("--swing-drop", `${swing.drop.toFixed(1)}px`);
      if (withDelay) {
        rig.style.setProperty("--swing-delay", `${Math.round(swing.delay)}ms`);
      }
    }

    applySwing(true);
    const rig = rigRef.current;
    const updateOnIteration = () => applySwing();
    rig?.addEventListener("animationiteration", updateOnIteration);
    return () => rig?.removeEventListener("animationiteration", updateOnIteration);
  }, []);

  return (
    <div className="motion-light">
      <div className="lamp-rig" ref={rigRef} aria-hidden="true">
        <span className="lamp-cable" />
        <span className="lamp-cap" />
        <span className="lamp-glow" />
        <span className="light-cone" />
      </div>
      <div className="light-dust" aria-hidden="true" />
    </div>
  );
}

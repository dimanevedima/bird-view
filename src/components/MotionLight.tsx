export function MotionLight() {
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

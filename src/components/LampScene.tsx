import { useEffect, useRef } from "react";
import * as THREE from "three";

type Tilt = {
  x: number;
  y: number;
  impulse: number;
};

function createGlowTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) return new THREE.Texture();
  const gradient = context.createRadialGradient(128, 64, 8, 128, 188, 238);
  gradient.addColorStop(0, "rgba(255, 246, 220, 0.52)");
  gradient.addColorStop(0.22, "rgba(255, 246, 220, 0.2)");
  gradient.addColorStop(0.5, "rgba(180, 220, 210, 0.075)");
  gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function LampScene() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const tiltRef = useRef<Tilt>({ x: 0, y: 0, impulse: 0 });

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
    camera.position.set(0, 0.14, 8.8);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const rig = new THREE.Group();
    rig.position.y = 0.62;
    scene.add(rig);

    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 2.2, 18),
      new THREE.MeshBasicMaterial({ color: 0x585858, transparent: true, opacity: 0.45 }),
    );
    cable.position.y = 2.08;
    rig.add(cable);

    const shade = new THREE.Mesh(
      new THREE.SphereGeometry(0.86, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: 0x090909,
        roughness: 0.82,
        metalness: 0.18,
      }),
    );
    shade.scale.set(0.82, 0.38, 0.72);
    shade.position.y = 1.02;
    shade.rotation.x = Math.PI;
    rig.add(shade);

    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.66, 0.017, 16, 96),
      new THREE.MeshBasicMaterial({ color: 0xfff1c7, transparent: true, opacity: 0.74 }),
    );
    rim.scale.x = 1.1;
    rim.position.y = 0.74;
    rim.rotation.x = Math.PI / 2;
    rig.add(rim);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 32, 18),
      new THREE.MeshBasicMaterial({ color: 0xfff3ce, transparent: true, opacity: 0.13 }),
    );
    bulb.position.y = 0.62;
    rig.add(bulb);

    const glowTexture = createGlowTexture();
    const beam = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        transparent: true,
        opacity: 0.48,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    beam.scale.set(4.8, 5.9, 1);
    beam.position.y = -1.72;
    beam.position.z = -0.52;
    rig.add(beam);

    const core = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        transparent: true,
        opacity: 0.26,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    core.scale.set(1.7, 4.4, 1);
    core.position.y = -1.55;
    core.position.z = -0.42;
    rig.add(core);

    const warm = new THREE.PointLight(0xffecd0, 1.55, 6.6, 1.85);
    warm.position.set(0, 0.62, 1.2);
    rig.add(warm);

    const accent = new THREE.PointLight(0x8fe7d8, 0.35, 5.4, 2);
    accent.position.set(0, -1.2, 2.2);
    rig.add(accent);

    const ambient = new THREE.AmbientLight(0xffffff, 0.04);
    scene.add(ambient);

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / Math.max(rect.height, 1);
      camera.updateProjectionMatrix();
    };
    resize();

    const onPointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      tiltRef.current.x = clamp((event.clientX - rect.left) / rect.width - 0.5, -0.5, 0.5) * 0.42;
      tiltRef.current.y = clamp((event.clientY - rect.top) / rect.height - 0.5, -0.5, 0.5) * -0.28;
    };

    let lastBeta = 0;
    let lastGamma = 0;
    const onOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta ?? 0;
      const gamma = event.gamma ?? 0;
      tiltRef.current.x = clamp(gamma / 42, -0.5, 0.5);
      tiltRef.current.y = clamp((beta - 38) / 68, -0.45, 0.45);
      const shake = Math.abs(beta - lastBeta) + Math.abs(gamma - lastGamma);
      tiltRef.current.impulse = Math.max(tiltRef.current.impulse, clamp(shake / 56, 0, 0.45));
      lastBeta = beta;
      lastGamma = gamma;
    };

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("deviceorientation", onOrientation, { passive: true });

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clock = new THREE.Clock();
    let frame = 0;
    const animate = () => {
      frame = window.requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const target = tiltRef.current;
      const swayX = reducedMotion ? 0 : Math.sin(elapsed * 0.62) * 0.025;
      const swayZ = reducedMotion ? 0 : Math.sin(elapsed * 0.48 + 1.7) * 0.018;
      rig.rotation.z += (target.x + swayX - rig.rotation.z) * 0.055;
      rig.rotation.x += (target.y + swayZ - rig.rotation.x) * 0.05;
      beam.position.x = -rig.rotation.z * 1.2;
      core.position.x = -rig.rotation.z * 1.55;
      rim.material.opacity = 0.7 + target.impulse * 0.18;
      beam.material.opacity = 0.38 + target.impulse * 0.16;
      core.material.opacity = 0.2 + target.impulse * 0.12;
      warm.intensity = 1.35 + target.impulse * 0.9;
      target.impulse *= 0.92;
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("deviceorientation", onOrientation);
      renderer.dispose();
      shade.geometry.dispose();
      rim.geometry.dispose();
      bulb.geometry.dispose();
      cable.geometry.dispose();
      glowTexture.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="lamp-scene" aria-hidden="true" />;
}

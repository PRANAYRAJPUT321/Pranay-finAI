"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Stars } from "@react-three/drei";
import * as THREE from "three";

/** Small seeded PRNG so particle layouts are stable across renders. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Particles streaming towards the camera: a "warp" tunnel. */
function Warp({ count = 1400, color }: { count?: number; color: string }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const rand = seeded(42);
    const a = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.2 + rand() * 9;
      const t = rand() * Math.PI * 2;
      a[i * 3] = Math.cos(t) * r;
      a[i * 3 + 1] = Math.sin(t) * r;
      a[i * 3 + 2] = -rand() * 70;
    }
    return a;
  }, [count]);
  useFrame((_, dt) => {
    const p = ref.current;
    if (!p) return;
    const arr = (p.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 2] += dt * 14;
      if (arr[i * 3 + 2] > 6) arr[i * 3 + 2] = -70;
    }
    p.geometry.attributes.position.needsUpdate = true;
    p.rotation.z += dt * 0.05;
  });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.07} color={color} sizeAttenuation transparent opacity={0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

const CORE_DEPTH = -3;
const CORE_RADIUS = 0.72;

function Core({ color, energy }: { color: string; energy: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const target = useMemo(() => new THREE.Color(color), [color]);
  // Park the core in the top-right corner whatever the stage's aspect ratio, so it never sits behind the text.
  const viewport = useThree((st) => st.viewport);
  const camera = useThree((st) => st.camera);
  const v = viewport.getCurrentViewport(camera, [0, 0, CORE_DEPTH]);
  const margin = CORE_RADIUS + 0.75;
  useFrame((state, dt) => {
    const m = ref.current;
    if (!m) return;
    m.rotation.y += dt * 0.4;
    const mat = m.material as THREE.MeshStandardMaterial;
    mat.color.lerp(target, 0.05);
    mat.emissive.lerp(target, 0.05);
    const s = 1 + energy * 0.08 + Math.sin(state.clock.elapsedTime * 2) * 0.03;
    m.scale.lerp(new THREE.Vector3(s, s, s), 0.2);
  });
  return (
    <Float speed={2} floatIntensity={0.35} rotationIntensity={0.4}>
      <mesh ref={ref} position={[v.width / 2 - margin, v.height / 2 - margin, CORE_DEPTH]}>
        <icosahedronGeometry args={[CORE_RADIUS, 20]} />
        <MeshDistortMaterial color={color} emissive={color} emissiveIntensity={0.55} roughness={0.15} metalness={0.4} distort={0.4} speed={2.4} />
      </mesh>
    </Float>
  );
}

export default function WarpScene({ color = "#8b5cf6", energy = 0, active = true }: { color?: string; energy?: number; active?: boolean }) {
  return (
    <Canvas frameloop={active ? "always" : "never"} dpr={[1, 1.5]} camera={{ position: [0, 0, 6], fov: 60 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.4} />
      <pointLight position={[4, 2, 3]} intensity={50} color="#c4b5fd" />
      <pointLight position={[-4, -2, 2]} intensity={30} color="#22d3ee" />
      <Stars radius={50} depth={30} count={1200} factor={3} fade speed={1} />
      <Warp color={color} />
      <Core color={color} energy={energy} />
    </Canvas>
  );
}

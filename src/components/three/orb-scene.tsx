"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import * as THREE from "three";

/**
 * "Readiness core": a living sphere whose colour shifts from violet towards
 * emerald as syllabus coverage grows; the outer ring is filled to the
 * coverage share and the inner ring to practice accuracy.
 */
function Core({ coverage, accuracy }: { coverage: number; accuracy: number }) {
  const ref = useRef<THREE.Mesh>(null);
  const color = useMemo(() => new THREE.Color("#7c3aed").lerp(new THREE.Color("#10b981"), Math.min(1, coverage)), [coverage]);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.3;
  });
  return (
    <>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={0.6}>
        <mesh ref={ref}>
          <icosahedronGeometry args={[1, 20]} />
          <MeshDistortMaterial color={color} emissive={color} emissiveIntensity={0.45} roughness={0.1} metalness={0.4} distort={0.32} speed={2} />
        </mesh>
      </Float>
      <Arc radius={1.7} share={coverage} color="#22d3ee" tilt={0.35} />
      <Arc radius={1.45} share={accuracy} color="#e879f9" tilt={-0.25} />
    </>
  );
}

function Arc({ radius, share, color, tilt }: { radius: number; share: number; color: string; tilt: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.z += dt * 0.2;
  });
  const s = Math.max(0.02, Math.min(1, share));
  return (
    <group ref={ref} rotation={[Math.PI / 2.2 + tilt, 0, 0]}>
      <mesh>
        <torusGeometry args={[radius, 0.012, 12, 160]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.12} />
      </mesh>
      <mesh>
        <torusGeometry args={[radius, 0.045, 16, 160, Math.PI * 2 * s]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function OrbScene({ coverage, accuracy, active = true }: { coverage: number; accuracy: number; active?: boolean }) {
  return (
    <Canvas frameloop={active ? "always" : "never"} dpr={[1, 1.75]} camera={{ position: [0, 0, 4.6], fov: 45 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 3, 3]} intensity={40} color="#c4b5fd" />
      <pointLight position={[-3, -2, 2]} intensity={25} color="#22d3ee" />
      <Sparkles count={40} scale={[4, 4, 4]} size={2} speed={0.4} color="#a5f3fc" />
      <Core coverage={coverage} accuracy={accuracy} />
    </Canvas>
  );
}

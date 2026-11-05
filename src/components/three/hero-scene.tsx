"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Float, Lightformer, MeshDistortMaterial, Sparkles, Stars } from "@react-three/drei";
import * as THREE from "three";

/** Glossy distorted core: the "market brain". */
function Core() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.15;
    ref.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
  });
  return (
    <Float speed={1.6} rotationIntensity={0.4} floatIntensity={0.9}>
      <mesh ref={ref} scale={1.05}>
        <icosahedronGeometry args={[1, 24]} />
        <MeshDistortMaterial color="#7c3aed" emissive="#2e1065" emissiveIntensity={0.6} roughness={0.08} metalness={0.55} distort={0.38} speed={1.6} envMapIntensity={1.4} />
      </mesh>
    </Float>
  );
}

/** Gyroscope rings orbiting the core. */
function Rings() {
  const group = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.children.forEach((c, i) => {
      c.rotation.x += dt * (0.25 + i * 0.12);
      c.rotation.y += dt * (0.18 - i * 0.05);
    });
  });
  const colors = ["#22d3ee", "#a78bfa", "#e879f9"];
  return (
    <group ref={group}>
      {colors.map((c, i) => (
        <mesh key={c} rotation={[Math.PI / 2 + i * 0.6, i * 0.9, 0]}>
          <torusGeometry args={[2.1 + i * 0.32, 0.018, 16, 160]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={2.2} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Coins orbiting on tilted paths. */
function Coins({ count = 14 }: { count?: number }) {
  const refs = useRef<THREE.Mesh[]>([]);
  const seeds = useMemo(() => Array.from({ length: count }, (_, i) => ({ r: 2.6 + (i % 4) * 0.45, speed: 0.18 + (i % 5) * 0.05, phase: (i / count) * Math.PI * 2, tilt: ((i % 3) - 1) * 0.5, y: ((i % 7) - 3) * 0.12 })), [count]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    seeds.forEach((s, i) => {
      const m = refs.current[i];
      if (!m) return;
      const a = s.phase + t * s.speed;
      m.position.set(Math.cos(a) * s.r, s.y + Math.sin(a) * s.tilt, Math.sin(a) * s.r * 0.55);
      m.rotation.set(t * 1.2 + i, t * 0.8, 0);
    });
  });
  return (
    <>
      {seeds.map((_, i) => (
        <mesh key={i} ref={(m) => { if (m) refs.current[i] = m; }}>
          <cylinderGeometry args={[0.16, 0.16, 0.035, 40]} />
          <meshStandardMaterial color={i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? "#c4b5fd" : "#67e8f9"} metalness={0.95} roughness={0.18} envMapIntensity={1.6} />
        </mesh>
      ))}
    </>
  );
}

/** A living bar-chart "city" under the core. */
function BarCity({ cols = 22, rows = 9 }: { cols?: number; rows?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const color = useMemo(() => new THREE.Color(), []);
  const n = cols * rows;
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const t = state.clock.elapsedTime;
    let k = 0;
    for (let x = 0; x < cols; x++) {
      for (let z = 0; z < rows; z++) {
        const h = 0.25 + 0.9 * (0.5 + 0.5 * Math.sin(x * 0.55 + t * 0.9) * Math.cos(z * 0.7 - t * 0.6)) + (x % 5 === 0 ? 0.4 : 0);
        dummy.position.set((x - cols / 2) * 0.42, -2.6 + h / 2, (z - rows / 2) * 0.42 - 1.5);
        dummy.scale.set(0.3, h, 0.3);
        dummy.updateMatrix();
        m.setMatrixAt(k, dummy.matrix);
        color.setHSL(0.72 - (h / 1.6) * 0.22, 0.85, 0.42 + h * 0.12);
        m.setColorAt(k, color);
        k++;
      }
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, n]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial roughness={0.35} metalness={0.4} emissive="#1e1b4b" emissiveIntensity={0.6} />
    </instancedMesh>
  );
}

/** Camera follows the pointer for parallax depth. */
function Rig() {
  useFrame((state) => {
    const { camera, pointer } = state;
    camera.position.x += (pointer.x * 1.4 - camera.position.x) * 0.04;
    camera.position.y += (0.6 + pointer.y * 0.8 - camera.position.y) * 0.04;
    camera.lookAt(0, -0.2, 0);
  });
  return null;
}

export default function HeroScene({ active = true }: { active?: boolean }) {
  return (
    <Canvas frameloop={active ? "always" : "never"} dpr={[1, 1.75]} camera={{ position: [0, 0.6, 8.2], fov: 42 }} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}>
      <ambientLight intensity={0.35} />
      <pointLight position={[4, 3, 4]} intensity={60} color="#a78bfa" />
      <pointLight position={[-5, -1, 3]} intensity={40} color="#22d3ee" />
      <directionalLight position={[0, 6, 2]} intensity={0.6} />
      <Environment resolution={128}>
        <Lightformer intensity={2.2} position={[0, 4, -6]} scale={[12, 4, 1]} color="#8b5cf6" />
        <Lightformer intensity={1.6} position={[-6, 0, 2]} rotation-y={Math.PI / 2} scale={[8, 3, 1]} color="#22d3ee" />
        <Lightformer intensity={1.2} position={[6, -1, 2]} rotation-y={-Math.PI / 2} scale={[8, 3, 1]} color="#e879f9" />
      </Environment>
      <Stars radius={60} depth={30} count={1600} factor={3} saturation={0.4} fade speed={0.6} />
      <Sparkles count={90} scale={[11, 6, 6]} size={2.2} speed={0.35} color="#c4b5fd" />
      <Core />
      <Rings />
      <Coins />
      <BarCity />
      <Rig />
    </Canvas>
  );
}

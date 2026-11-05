"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, Line, OrbitControls, Sparkles, Stars } from "@react-three/drei";
import * as THREE from "three";

export type GalaxyTopic = { id: string; name: string; weight: number; mastery: string; estimate: number | null; children: { id: string; name: string }[]; prereqs: string[] };

export const MASTERY_COLOR: Record<string, string> = {
  NOT_STARTED: "#6f77ad",
  INSUFFICIENT_EVIDENCE: "#a78bfa",
  NEEDS_WORK: "#fb7185",
  DEVELOPING: "#fbbf24",
  PROFICIENT: "#22d3ee",
  MASTERED: "#34d399",
};

function layout(topics: GalaxyTopic[]) {
  const n = topics.length;
  return topics.map((t, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 4.2 + (i % 2) * 1.6;
    return { ...t, pos: new THREE.Vector3(Math.cos(a) * r, Math.sin(i * 1.7) * 0.6, Math.sin(a) * r), size: 0.32 + Math.min(1, t.weight / 20) * 0.45, orbit: r, angle: a };
  });
}

function Planet({ p, selected, onSelect }: { p: ReturnType<typeof layout>[number]; selected: boolean; onSelect: (id: string) => void }) {
  const ref = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const color = MASTERY_COLOR[p.mastery] ?? MASTERY_COLOR.NOT_STARTED;
  useFrame((state, dt) => {
    if (!ref.current) return;
    ref.current.rotation.y += dt * 0.4;
    const s = selected || hover ? 1.25 : 1;
    ref.current.scale.lerp(new THREE.Vector3(s, s, s), 0.12);
    ref.current.position.y = p.pos.y + Math.sin(state.clock.elapsedTime * 0.8 + p.angle) * 0.12;
  });
  return (
    <group ref={ref} position={p.pos}>
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelect(p.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[p.size, 48, 48]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 0.9 : 0.45} roughness={0.25} metalness={0.3} />
      </mesh>
      <mesh rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[p.size * 1.6, 0.01, 8, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
      {p.children.slice(0, 6).map((c, k) => (
        <Moon key={c.id} radius={p.size * 1.6} phase={(k / Math.max(1, p.children.length)) * Math.PI * 2} color={color} />
      ))}
      <Html center distanceFactor={9} position={[0, p.size + 0.55, 0]} style={{ pointerEvents: "none" }}>
        <div className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur ${selected ? "border-white/60 bg-white/15 text-white" : "border-white/15 bg-black/40 text-white/85"}`}>{p.name}</div>
      </Html>
    </group>
  );
}

function Moon({ radius, phase, color }: { radius: number; phase: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.7 + phase;
    if (ref.current) ref.current.position.set(Math.cos(t) * radius, Math.sin(t) * radius * 0.35, Math.sin(t) * radius);
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.06, 16, 16]} />
      <meshStandardMaterial color="#ffffff" emissive={color} emissiveIntensity={1.2} />
    </mesh>
  );
}

function Sun({ label }: { label: string }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.04);
  });
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[0.9, 64, 64]} />
        <meshStandardMaterial color="#fde68a" emissive="#f59e0b" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <pointLight intensity={80} color="#fbbf24" distance={30} />
      <Html center distanceFactor={9} position={[0, 1.5, 0]} style={{ pointerEvents: "none" }}>
        <div className="whitespace-nowrap rounded-full bg-amber-400/90 px-3 py-1 text-xs font-bold text-black shadow-lg">{label}</div>
      </Html>
    </group>
  );
}

export default function GalaxyScene({ topics, examLabel, selected, onSelect }: { topics: GalaxyTopic[]; examLabel: string; selected: string | null; onSelect: (id: string | null) => void }) {
  const planets = useMemo(() => layout(topics), [topics]);
  const byId = useMemo(() => new Map(planets.map((p) => [p.id, p])), [planets]);
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [0, 6.5, 11.5], fov: 50 }} onPointerMissed={() => onSelect(null)} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.35} />
      <Stars radius={80} depth={40} count={2500} factor={3.5} fade speed={0.4} />
      <Sparkles count={120} scale={[18, 6, 18]} size={1.6} speed={0.25} color="#c4b5fd" />
      <Sun label={examLabel} />
      {[4.2, 5.8].map((r) => (
        <mesh key={r} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r - 0.008, r + 0.008, 180]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {planets.flatMap((p) =>
        p.prereqs.map((q) => {
          const from = byId.get(q);
          return from ? <Line key={`${q}-${p.id}`} points={[from.pos, p.pos]} color="#67e8f9" lineWidth={1} dashed dashSize={0.25} gapSize={0.15} transparent opacity={0.55} /> : null;
        }),
      )}
      {planets.map((p) => <Planet key={p.id} p={p} selected={selected === p.id} onSelect={onSelect} />)}
      <OrbitControls enablePan={false} minDistance={6} maxDistance={22} autoRotate={!selected} autoRotateSpeed={0.35} maxPolarAngle={Math.PI * 0.62} />
    </Canvas>
  );
}

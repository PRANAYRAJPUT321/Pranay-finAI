"use client";

import { useMemo, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export type SurfaceGrid = { xs: number[]; ys: number[]; z: number[][] }; // z[j][i] for ys[j], xs[i]

const SIZE = 6;
const HEIGHT = 3.2;
const STOPS = ["#6d28d9", "#8b5cf6", "#22d3ee", "#34d399", "#fbbf24"].map((c) => new THREE.Color(c));

function colorAt(t: number, out: THREE.Color) {
  const s = Math.max(0, Math.min(0.9999, t)) * (STOPS.length - 1);
  const i = Math.floor(s);
  return out.copy(STOPS[i]).lerp(STOPS[i + 1], s - i);
}

function Surface({ grid, onHover }: { grid: SurfaceGrid; onHover: (x: number, y: number, z: number) => void }) {
  const [marker, setMarker] = useState<THREE.Vector3 | null>(null);
  const { geometry, zMin, zMax } = useMemo(() => {
    const nx = grid.xs.length;
    const ny = grid.ys.length;
    const flat = grid.z.flat().filter(Number.isFinite);
    const zMin = Math.min(...flat);
    const zMax = Math.max(...flat);
    const g = new THREE.PlaneGeometry(SIZE, SIZE, nx - 1, ny - 1);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const colors = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i;
        const zv = grid.z[j][i];
        const t = zMax > zMin ? (zv - zMin) / (zMax - zMin) : 0;
        pos.setXYZ(k, (i / (nx - 1) - 0.5) * SIZE, t * HEIGHT, (j / (ny - 1) - 0.5) * SIZE);
        colorAt(t, c).toArray(colors, k * 3);
      }
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return { geometry: g, zMin, zMax };
  }, [grid]);

  const handle = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const p = e.point;
    const fx = Math.max(0, Math.min(1, p.x / SIZE + 0.5));
    const fy = Math.max(0, Math.min(1, p.z / SIZE + 0.5));
    const x = grid.xs[0] + fx * (grid.xs[grid.xs.length - 1] - grid.xs[0]);
    const y = grid.ys[0] + fy * (grid.ys[grid.ys.length - 1] - grid.ys[0]);
    setMarker(p.clone());
    onHover(x, y, zMin + (p.y / HEIGHT) * (zMax - zMin));
  };

  return (
    <group>
      <mesh geometry={geometry} onPointerMove={handle} onPointerDown={handle}>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={0.35} metalness={0.25} emissive="#1e1b4b" emissiveIntensity={0.35} />
      </mesh>
      <mesh geometry={geometry} position={[0, 0.003, 0]}>
        <meshBasicMaterial wireframe color="#ffffff" transparent opacity={0.08} />
      </mesh>
      {marker && (
        <mesh position={marker}>
          <sphereGeometry args={[0.09, 24, 24]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
}

function Axes({ xLabel, yLabel, zLabel, xTicks, yTicks, zTicks }: { xLabel: string; yLabel: string; zLabel: string; xTicks: string[]; yTicks: string[]; zTicks: string[] }) {
  const half = SIZE / 2;
  const edges = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-half, 0, half), new THREE.Vector3(half, 0, half),
      new THREE.Vector3(-half, 0, half), new THREE.Vector3(-half, 0, -half),
      new THREE.Vector3(-half, 0, half), new THREE.Vector3(-half, HEIGHT, half),
    ]);
    return g;
  }, [half]);
  const tag = "whitespace-nowrap rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/80";
  return (
    <group>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#8f95bf" transparent opacity={0.6} />
      </lineSegments>
      {xTicks.map((t, i) => (
        <Html key={`x${i}`} position={[-half + (i / (xTicks.length - 1)) * SIZE, -0.05, half + 0.45]} center style={{ pointerEvents: "none" }}><span className={tag}>{t}</span></Html>
      ))}
      {yTicks.map((t, i) => (
        <Html key={`y${i}`} position={[-half - 0.5, -0.05, half - (i / (yTicks.length - 1)) * SIZE]} center style={{ pointerEvents: "none" }}><span className={tag}>{t}</span></Html>
      ))}
      {zTicks.map((t, i) => (
        <Html key={`z${i}`} position={[-half - 0.45, (i / (zTicks.length - 1)) * HEIGHT, half]} center style={{ pointerEvents: "none" }}><span className={tag}>{t}</span></Html>
      ))}
      <Html position={[0, -0.05, half + 1]} center style={{ pointerEvents: "none" }}><span className="whitespace-nowrap text-xs font-semibold text-mint-300">{xLabel} →</span></Html>
      <Html position={[-half - 1.2, -0.05, 0]} center style={{ pointerEvents: "none" }}><span className="whitespace-nowrap text-xs font-semibold text-gold-300">{yLabel} →</span></Html>
      <Html position={[-half - 0.6, HEIGHT + 0.5, half]} center style={{ pointerEvents: "none" }}><span className="whitespace-nowrap text-xs font-semibold text-amber-300">↑ {zLabel}</span></Html>
    </group>
  );
}

export default function SurfaceScene(props: {
  grid: SurfaceGrid;
  labels: { x: string; y: string; z: string };
  ticks: { x: string[]; y: string[]; z: string[] };
  onHover: (x: number, y: number, z: number) => void;
}) {
  return (
    <Canvas dpr={[1, 1.75]} camera={{ position: [8.6, 7.2, 9.6], fov: 42 }} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[5, 8, 4]} intensity={1.2} />
      <pointLight position={[-6, 4, -4]} intensity={30} color="#22d3ee" />
      <group position={[0, -1.2, 0]}>
        <Surface grid={props.grid} onHover={props.onHover} />
        <Axes xLabel={props.labels.x} yLabel={props.labels.y} zLabel={props.labels.z} xTicks={props.ticks.x} yTicks={props.ticks.y} zTicks={props.ticks.z} />
      </group>
      <OrbitControls enablePan={false} minDistance={8} maxDistance={22} maxPolarAngle={Math.PI * 0.48} autoRotate autoRotateSpeed={0.5} />
    </Canvas>
  );
}

"use client";

import dynamic from "next/dynamic";
import { SceneGate } from "./gate";

const HeroScene = dynamic(() => import("./hero-scene"), { ssr: false });
const OrbScene = dynamic(() => import("./orb-scene"), { ssr: false });

/** CSS stand-in shown while WebGL loads, or permanently when it is unavailable. */
export function OrbFallback({ size = "h-56 w-56" }: { size?: string }) {
  return (
    <div className="relative grid h-full w-full place-items-center">
      <span className={`orb orb-violet orb-pulse ${size}`} />
      <span aria-hidden className="absolute h-[70%] w-[70%] rounded-full border border-mint-400/40 [transform:rotateX(70deg)]" />
    </div>
  );
}

export function Hero3D({ className }: { className?: string }) {
  return (
    <SceneGate className={className} fallback={<OrbFallback size="h-72 w-72" />}>
      {(visible) => <HeroScene active={visible} />}
    </SceneGate>
  );
}

export function ReadinessOrb({ coverage, accuracy, className }: { coverage: number; accuracy: number; className?: string }) {
  return (
    <SceneGate className={className} fallback={<OrbFallback size="h-40 w-40" />}>
      {(visible) => <OrbScene coverage={coverage} accuracy={accuracy} active={visible} />}
    </SceneGate>
  );
}

export function Logo({ inverted = false, compact = false }: { inverted?: boolean; compact?: boolean }) {
  return (
    <span className="group inline-flex items-center gap-2">
      <span aria-hidden className="bg-gradient-gold font-display grid h-9 w-9 place-items-center rounded-xl text-sm font-extrabold text-white shadow-[0_0_24px_rgba(139,92,246,0.6)] ring-1 ring-white/30 transition-transform duration-500 group-hover:rotate-[10deg] group-hover:scale-110">
        PD
      </span>
      {!compact && (
        <span className={`font-display text-lg font-bold tracking-tight ${inverted ? "text-white" : "text-navy-900"}`}>
          Fin<span className="text-gradient-brand">Prep</span>
        </span>
      )}
    </span>
  );
}

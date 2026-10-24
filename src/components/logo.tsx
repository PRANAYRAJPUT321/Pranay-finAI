export function Logo({ inverted = false, compact = false }: { inverted?: boolean; compact?: boolean }) {
  return (
    <span className="group inline-flex items-center gap-2">
      <span aria-hidden className="bg-gradient-gold grid h-9 w-9 place-items-center rounded-xl text-sm font-black text-navy-950 shadow-lg shadow-gold-500/30 ring-1 ring-white/40 transition-transform duration-300 group-hover:rotate-6 group-hover:scale-105">
        PD
      </span>
      {!compact && (
        <span className={`text-lg font-bold tracking-tight ${inverted ? "text-white" : "text-navy-900"}`}>
          Fin<span className={inverted ? "text-gradient-gold" : "text-gold-600"}>Prep</span>
        </span>
      )}
    </span>
  );
}

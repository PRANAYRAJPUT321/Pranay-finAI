export function Logo({ inverted = false, compact = false }: { inverted?: boolean; compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="grid h-8 w-8 place-items-center rounded-lg bg-gold-500 text-sm font-bold text-navy-950">
        PD
      </span>
      {!compact && (
        <span className={`text-lg font-semibold tracking-tight ${inverted ? "text-white" : "text-navy-900"}`}>
          FinPrep
        </span>
      )}
    </span>
  );
}

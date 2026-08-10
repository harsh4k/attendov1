import { cn } from "@/lib/utils";

export function AttendanceRing({
  value,
  size = 148,
  stroke = 12,
  label,
  sublabel,
  className,
}: {
  value: number | null;
  size?: number;
  stroke?: number;
  label?: string;
  sublabel?: string;
  className?: string;
}) {
  const pct = value ?? 0;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  const tone =
    value === null
      ? "var(--color-muted-foreground)"
      : value >= 80
        ? "var(--color-success)"
        : value >= 75
          ? "var(--color-warning)"
          : "var(--color-destructive)";

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke="var(--color-border)"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={tone}
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-serif text-3xl leading-none tracking-tight text-foreground">
          {label ?? (value === null ? "—" : `${value.toFixed(1)}%`)}
        </span>
        {sublabel ? (
          <span className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            {sublabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

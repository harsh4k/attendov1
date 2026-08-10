import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "danger" | "primary";
  className?: string;
}) {
  const tones = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning-foreground",
    danger: "text-destructive",
    primary: "text-primary",
  } as const;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </p>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <p className={cn("mt-3 font-serif text-3xl leading-none tracking-tight", tones[tone])}>
        {value}
      </p>
      {hint ? <p className="mt-2 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

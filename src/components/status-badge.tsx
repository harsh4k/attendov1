import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/lib/attendance";

const styles: Record<AttendanceStatus, string> = {
  SAFE: "bg-success/12 text-success border-success/25",
  WARNING: "bg-warning/15 text-warning-foreground border-warning/40",
  DEFAULTER: "bg-destructive/10 text-destructive border-destructive/25",
  NO_DATA: "bg-muted text-muted-foreground border-border",
};

const labels: Record<AttendanceStatus, string> = {
  SAFE: "Safe",
  WARNING: "At risk",
  DEFAULTER: "Defaulter",
  NO_DATA: "No data",
};

export function StatusBadge({
  status,
  className,
}: {
  status: AttendanceStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-tight",
        styles[status],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  );
}

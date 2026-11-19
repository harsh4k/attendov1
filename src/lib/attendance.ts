/**
 * Centralized attendance business logic.
 * Every percentage, status, recovery and safe-miss figure in the app comes from here.
 */

export const ATTENDANCE_TARGET = 0.8; // 80% requirement
export const DEFAULTER_THRESHOLD = 75; // below this the student is a defaulter

export type AttendanceStatus = "SAFE" | "WARNING" | "DEFAULTER" | "NO_DATA";

/** Attendance percentage, or null when no lecture has been conducted yet. */
export function calculateAttendance(attended: number, total: number): number | null {
  if (!Number.isFinite(total) || total <= 0) return null;
  const safeAttended = Math.max(0, Math.min(attended, total));
  return (safeAttended / total) * 100;
}

/**
 * Minimum number of consecutive future lectures the student must attend to reach
 * the target: smallest integer x where (A + x) / (T + x) >= target.
 */
export function calculateRecoveryLectures(
  attended: number,
  total: number,
  target: number = ATTENDANCE_TARGET,
): number {
  if (total <= 0) return 0;
  if (target >= 1) return Infinity;
  const needed = (target * total - attended) / (1 - target);
  if (needed <= 0) return 0;
  return Math.ceil(needed - 1e-9);
}

/**
 * How many further lectures the student can miss and still stay at or above the
 * target: largest integer y where A / (T + y) >= target.
 */
export function calculateSafeMisses(
  attended: number,
  total: number,
  target: number = ATTENDANCE_TARGET,
): number {
  if (total <= 0) return 0;
  const maxTotal = Math.floor(attended / target + 1e-9);
  return Math.max(0, maxTotal - total);
}

export function getAttendanceStatus(percentage: number | null): AttendanceStatus {
  if (percentage === null) return "NO_DATA";
  if (percentage >= ATTENDANCE_TARGET * 100) return "SAFE";
  if (percentage >= DEFAULTER_THRESHOLD) return "WARNING";
  return "DEFAULTER";
}

export type AttendanceSummary = {
  attended: number;
  total: number;
  missed: number;
  percentage: number | null;
  status: AttendanceStatus;
  recoveryLectures: number;
  safeMisses: number;
};

export function summarize(attended: number, total: number): AttendanceSummary {
  const percentage = calculateAttendance(attended, total);
  return {
    attended,
    total,
    missed: Math.max(0, total - attended),
    percentage,
    status: getAttendanceStatus(percentage),
    recoveryLectures: calculateRecoveryLectures(attended, total),
    safeMisses: calculateSafeMisses(attended, total),
  };
}

export function formatPercentage(percentage: number | null, digits = 1): string {
  if (percentage === null) return "—";
  return `${percentage.toFixed(digits)}%`;
}

export const statusLabel: Record<AttendanceStatus, string> = {
  SAFE: "SAFE",
  WARNING: "WARNING",
  DEFAULTER: "DEFAULTER",
  NO_DATA: "NO DATA",
};

import {
  calculateAttendance,
  calculateRecoveryLectures,
  calculateSafeMisses,
  getAttendanceStatus,
  type AttendanceSummary,
} from "./attendance";

export type Role = "student" | "faculty" | "admin";
export type LectureStatus = "scheduled" | "ongoing" | "completed" | "cancelled";
export type AttStatus = "present" | "absent";

export type Subject = {
  id: string;
  name: string;
  code: string;
  semester: number;
  division: string;
  faculty_name?: string | null;
};

export type Lecture = {
  id: string;
  subject_id: string;
  faculty_id: string | null;
  lecture_date: string;
  start_time: string;
  end_time: string;
  topic: string | null;
  status: LectureStatus;
};

export type AttendanceRow = {
  id: string;
  student_id: string;
  lecture_id: string;
  status: AttStatus;
  marked_at: string;
};

export type StudentRow = {
  id: string;
  roll_number: string;
  semester: number;
  division: string;
  full_name: string;
  email: string;
};

export type NotificationRow = {
  id: string;
  title: string;
  body: string;
  kind: string;
  read: boolean;
  created_at: string;
};

/** Lecture instants are stored as a date + wall-clock time in UTC. */
export function lectureStart(l: Lecture): Date {
  return new Date(`${l.lecture_date}T${l.start_time}Z`);
}
export function lectureEnd(l: Lecture): Date {
  return new Date(`${l.lecture_date}T${l.end_time}Z`);
}
export function hasEnded(l: Lecture, now = new Date()): boolean {
  return lectureEnd(l).getTime() <= now.getTime();
}
export const MARK_WINDOW_MS = 2 * 60 * 60 * 1000;

export type MarkingState = "marked" | "available" | "not_ended" | "cancelled" | "expired";

export function markingState(
  l: Lecture,
  marked: AttendanceRow | undefined,
  now = new Date(),
): MarkingState {
  if (marked) return "marked";
  if (l.status === "cancelled") return "cancelled";
  if (l.status !== "completed" || !hasEnded(l, now)) return "not_ended";
  if (now.getTime() > lectureEnd(l).getTime() + MARK_WINDOW_MS) return "expired";
  return "available";
}

/** Lectures that count towards attendance: conducted (completed) and already over. */
export function countableLectures(lectures: Lecture[], now = new Date()): Lecture[] {
  return lectures.filter((l) => l.status === "completed" && hasEnded(l, now));
}

export function summarizeFrom(lectures: Lecture[], attendance: AttendanceRow[]): AttendanceSummary {
  const conducted = countableLectures(lectures);
  const present = new Set(
    attendance.filter((a) => a.status === "present").map((a) => a.lecture_id),
  );
  const attended = conducted.filter((l) => present.has(l.id)).length;
  const total = conducted.length;
  const percentage = calculateAttendance(attended, total);
  return {
    attended,
    total,
    missed: total - attended,
    percentage,
    status: getAttendanceStatus(percentage),
    recoveryLectures: calculateRecoveryLectures(attended, total),
    safeMisses: calculateSafeMisses(attended, total),
  };
}

export function formatTimeRange(l: Lecture): string {
  const fmt = (t: string) => {
    const [h, m] = t.split(":");
    const hour = Number(h);
    const suffix = hour >= 12 ? "PM" : "AM";
    const h12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${h12}:${m} ${suffix}`;
  };
  return `${fmt(l.start_time)} – ${fmt(l.end_time)}`;
}

export function formatDay(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  });
}

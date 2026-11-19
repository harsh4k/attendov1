import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarCheck, CheckCircle2, Target, TrendingDown } from "lucide-react";
import { toast } from "sonner";
import { studentDataQuery } from "@/lib/queries";
import { markAttendance } from "@/lib/api.functions";
import {
  formatDay,
  formatTimeRange,
  markingState,
  summarizeFrom,
  type Lecture,
} from "@/lib/domain";
import { formatPercentage } from "@/lib/attendance";
import { AttendanceRing } from "@/components/attendance-ring";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { PageLoader, EmptyState } from "@/components/states";
import { Button } from "@/components/ui/button";

export function StudentDashboard() {
  const { data, isPending } = useQuery(studentDataQuery);
  const queryClient = useQueryClient();

  const mark = useMutation({
    mutationFn: (lectureId: string) => markAttendance({ data: { lectureId } }),
    onSuccess: () => {
      toast.success("Attendance marked");
      queryClient.invalidateQueries({ queryKey: ["student-data"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const overall = useMemo(
    () => (data ? summarizeFrom(data.lectures as Lecture[], data.attendance) : null),
    [data],
  );

  const perSubject = useMemo(() => {
    if (!data) return [];
    return data.subjects.map((s) => {
      const lectures = (data.lectures as Lecture[]).filter((l) => l.subject_id === s.id);
      const ids = new Set(lectures.map((l) => l.id));
      const summary = summarizeFrom(
        lectures,
        data.attendance.filter((a) => ids.has(a.lecture_id)),
      );
      return { subject: s, summary };
    });
  }, [data]);

  const markable = useMemo(() => {
    if (!data) return [];
    const byLecture = new Map(data.attendance.map((a) => [a.lecture_id, a]));
    return (data.lectures as Lecture[])
      .filter((l) => markingState(l, byLecture.get(l.id)) === "available")
      .slice(0, 6);
  }, [data]);

  const recent = useMemo(() => {
    if (!data) return [];
    const byLecture = new Map(data.attendance.map((a) => [a.lecture_id, a]));
    const subjects = new Map(data.subjects.map((s) => [s.id, s]));
    return (data.lectures as Lecture[])
      .filter((l) => l.status !== "scheduled")
      .slice(0, 8)
      .map((l) => ({
        lecture: l,
        subject: subjects.get(l.subject_id),
        record: byLecture.get(l.id),
      }));
  }, [data]);

  if (isPending || !data || !overall) return <PageLoader />;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            Roll {data.student.roll_number} · Sem {data.student.semester} · Div{" "}
            {data.student.division}
          </p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight">Your attendance</h1>
        </div>
        <StatusBadge status={overall.status} />
      </header>

      <section className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <div className="flex items-center justify-center rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
          <AttendanceRing value={overall.percentage} sublabel="overall" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard
            label="Lectures attended"
            value={`${overall.attended}/${overall.total}`}
            hint={`${overall.missed} missed so far`}
            icon={<CalendarCheck className="size-4" />}
          />
          <StatCard
            label="Requirement"
            value="80%"
            hint={`You are ${overall.percentage !== null ? (overall.percentage - 80).toFixed(1) : "—"} points from target`}
            icon={<Target className="size-4" />}
          />
          {overall.percentage !== null && overall.percentage >= 80 ? (
            <StatCard
              label="Safe misses left"
              value={overall.safeMisses}
              tone="success"
              hint="Lectures you can skip and stay above 80%"
              icon={<CheckCircle2 className="size-4" />}
            />
          ) : (
            <StatCard
              label="Recovery target"
              value={overall.recoveryLectures}
              tone="danger"
              hint="Consecutive lectures to attend to reach 80%"
              icon={<TrendingDown className="size-4" />}
            />
          )}
        </div>
      </section>

      {overall.percentage !== null && overall.percentage < 80 ? (
        <section className="rounded-xl border border-primary/25 bg-primary/5 p-6">
          <h2 className="font-serif text-xl tracking-tight">Recovery plan</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Attend the next{" "}
            <span className="font-semibold text-foreground">
              {overall.recoveryLectures} lectures
            </span>{" "}
            without missing one to move from {formatPercentage(overall.percentage)} back to 80%.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {perSubject
              .filter((p) => p.summary.percentage !== null && p.summary.percentage < 80)
              .map((p) => (
                <div key={p.subject.id} className="rounded-lg border border-border bg-card p-4">
                  <p className="text-sm font-medium">{p.subject.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatPercentage(p.summary.percentage)} · attend {p.summary.recoveryLectures}{" "}
                    more
                  </p>
                </div>
              ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl tracking-tight">Ready to mark</h2>
          <Link to="/history" className="text-sm text-primary hover:underline">
            View history
          </Link>
        </div>
        {markable.length === 0 ? (
          <EmptyState
            title="Nothing to mark right now"
            body="Marking opens right after a lecture ends and stays open for two hours."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {markable.map((l) => {
              const subject = data.subjects.find((s) => s.id === l.subject_id);
              return (
                <div
                  key={l.id}
                  className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{subject?.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDay(l.lecture_date)} · {formatTimeRange(l)}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => mark.mutate(l.id)} disabled={mark.isPending}>
                    Mark present
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl tracking-tight">Subject breakdown</h2>
          <Link to="/subjects" className="text-sm text-primary hover:underline">
            All subjects
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {perSubject.map(({ subject, summary }) => (
            <div
              key={subject.id}
              className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{subject.name}</p>
                  <p className="text-xs text-muted-foreground">{subject.code}</p>
                </div>
                <StatusBadge status={summary.status} />
              </div>
              <p className="mt-4 font-serif text-2xl tracking-tight">
                {formatPercentage(summary.percentage)}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-700"
                  style={{ width: `${Math.min(100, summary.percentage ?? 0)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {summary.attended}/{summary.total} attended ·{" "}
                {summary.percentage !== null && summary.percentage >= 80
                  ? `${summary.safeMisses} safe misses`
                  : `attend ${summary.recoveryLectures} to recover`}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl tracking-tight">Recent lectures</h2>
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {recent.map(({ lecture, subject, record }) => (
            <div
              key={lecture.id}
              className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{subject?.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDay(lecture.lecture_date)} · {formatTimeRange(lecture)}
                </p>
              </div>
              <span
                className={
                  lecture.status === "cancelled"
                    ? "text-xs text-muted-foreground"
                    : record?.status === "present"
                      ? "text-xs font-medium text-success"
                      : "text-xs font-medium text-destructive"
                }
              >
                {lecture.status === "cancelled"
                  ? "Cancelled"
                  : record?.status === "present"
                    ? "Present"
                    : "Absent"}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

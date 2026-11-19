import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CalendarClock, ShieldAlert, Users } from "lucide-react";
import { facultyDataQuery } from "@/lib/queries";
import { summarizeFrom, type Lecture } from "@/lib/domain";
import { formatPercentage } from "@/lib/attendance";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { PageLoader, EmptyState } from "@/components/states";

export function StaffDashboard({ role, name }: { role: string; name: string }) {
  const { data, isPending } = useQuery(facultyDataQuery);

  const subjectStats = useMemo(() => {
    if (!data) return [];
    return data.subjects.map((s) => {
      const lectures = (data.lectures as Lecture[]).filter((l) => l.subject_id === s.id);
      const ids = new Set(lectures.map((l) => l.id));
      const enrolled = data.enrollments.filter((e) => e.subject_id === s.id).length;
      const rows = data.attendance.filter((a) => ids.has(a.lecture_id));
      const conducted = lectures.filter((l) => l.status === "completed").length;
      const present = rows.filter((a) => a.status === "present").length;
      const denom = conducted * Math.max(1, enrolled);
      return {
        subject: s,
        enrolled,
        conducted,
        average: denom > 0 ? (present / denom) * 100 : null,
      };
    });
  }, [data]);

  const studentStats = useMemo(() => {
    if (!data) return [];
    return data.students.map((st) => {
      const subjectIds = new Set(
        data.enrollments.filter((e) => e.student_id === st.id).map((e) => e.subject_id),
      );
      const lectures = (data.lectures as Lecture[]).filter((l) => subjectIds.has(l.subject_id));
      const summary = summarizeFrom(
        lectures,
        data.attendance.filter((a) => a.student_id === st.id),
      );
      return { student: st, summary };
    });
  }, [data]);

  if (isPending || !data) return <PageLoader />;

  const defaulters = studentStats.filter(
    (s) => s.summary.percentage !== null && s.summary.percentage < 75,
  );
  const overallAvg =
    studentStats.length > 0
      ? studentStats.reduce((acc, s) => acc + (s.summary.percentage ?? 0), 0) / studentStats.length
      : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <header>
        <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          {role} workspace
        </p>
        <h1 className="mt-1 font-serif text-3xl tracking-tight">Welcome back, {name}</h1>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Subjects"
          value={data.subjects.length}
          icon={<BookOpen className="size-4" />}
        />
        <StatCard
          label="Students"
          value={data.students.length}
          icon={<Users className="size-4" />}
        />
        <StatCard
          label="Class average"
          value={formatPercentage(overallAvg)}
          tone={overallAvg !== null && overallAvg >= 80 ? "success" : "warning"}
          icon={<CalendarClock className="size-4" />}
        />
        <StatCard
          label="Defaulters"
          value={defaulters.length}
          tone={defaulters.length > 0 ? "danger" : "success"}
          hint="Below 75% overall"
          icon={<ShieldAlert className="size-4" />}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl tracking-tight">Subjects</h2>
        {subjectStats.length === 0 ? (
          <EmptyState
            title="No subjects assigned"
            body="Ask an administrator to assign subjects."
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {subjectStats.map((s) => (
              <div
                key={s.subject.id}
                className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]"
              >
                <p className="text-sm font-medium">{s.subject.name}</p>
                <p className="text-xs text-muted-foreground">
                  {s.subject.code} · Sem {s.subject.semester} · Div {s.subject.division}
                </p>
                <p className="mt-4 font-serif text-2xl tracking-tight">
                  {formatPercentage(s.average)}
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${Math.min(100, s.average ?? 0)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {s.conducted} lectures conducted · {s.enrolled} students
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-xl tracking-tight">Students at risk</h2>
        {defaulters.length === 0 ? (
          <EmptyState title="No defaulters" body="No student with attendance data is below 75%." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {defaulters.map(({ student, summary }) => (
              <div
                key={student.id}
                className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{student.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Roll {student.roll_number} · attend {summary.recoveryLectures} lectures to
                    recover
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-serif text-lg">{formatPercentage(summary.percentage)}</span>
                  <StatusBadge status={summary.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

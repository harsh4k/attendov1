import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { PageLoader, EmptyState } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { studentDataQuery } from "@/lib/queries";
import { summarizeFrom, type Lecture } from "@/lib/domain";
import { formatPercentage } from "@/lib/attendance";

export const Route = createFileRoute("/_authenticated/subjects")({
  head: () => ({
    meta: [
      { title: "Subjects — Attendo Attendance" },
      {
        name: "description",
        content: "Subject-wise attendance percentage, recovery lectures and safe misses.",
      },
      { property: "og:title", content: "Subjects — Attendo Attendance" },
      { property: "og:description", content: "Subject-wise attendance breakdown." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubjectsPage,
});

function SubjectsPage() {
  const { data, isPending } = useQuery(studentDataQuery);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.subjects.map((s) => {
      const lectures = (data.lectures as Lecture[]).filter((l) => l.subject_id === s.id);
      const ids = new Set(lectures.map((l) => l.id));
      return {
        subject: s,
        summary: summarizeFrom(
          lectures,
          data.attendance.filter((a) => ids.has(a.lecture_id)),
        ),
      };
    });
  }, [data]);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="font-serif text-3xl tracking-tight">Subjects</h1>
        {isPending || !data ? (
          <PageLoader />
        ) : rows.length === 0 ? (
          <EmptyState title="No subjects yet" body="You are not enrolled in any subject." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]">
            {rows.map(({ subject, summary }) => (
              <div
                key={subject.id}
                className="grid gap-3 border-b border-border px-5 py-4 last:border-0 sm:grid-cols-[1fr_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{subject.name}</p>
                    <StatusBadge status={summary.status} />
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {subject.code}
                    {subject.faculty_name ? ` · ${subject.faculty_name}` : ""} · {summary.attended}/
                    {summary.total} attended
                  </p>
                  <div className="mt-2 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${Math.min(100, summary.percentage ?? 0)}%` }}
                    />
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-serif text-2xl tracking-tight">
                    {formatPercentage(summary.percentage)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {summary.percentage !== null && summary.percentage >= 80
                      ? `${summary.safeMisses} safe misses`
                      : `attend ${summary.recoveryLectures} to recover`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

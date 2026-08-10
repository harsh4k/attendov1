import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { PageLoader, EmptyState } from "@/components/states";
import { StatusBadge } from "@/components/status-badge";
import { facultyDataQuery } from "@/lib/queries";
import { summarizeFrom, type Lecture } from "@/lib/domain";
import { formatPercentage } from "@/lib/attendance";

export const Route = createFileRoute("/_authenticated/defaulters")({
  head: () => ({
    meta: [
      { title: "Defaulters — Attendo" },
      { name: "description", content: "Students below the 75% attendance threshold with recovery targets." },
      { property: "og:title", content: "Defaulters — Attendo" },
      { property: "og:description", content: "Track at-risk students and their recovery lectures." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DefaultersPage,
});

function DefaultersPage() {
  const { data, isPending } = useQuery(facultyDataQuery);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.students
      .map((st) => {
        const subjectIds = new Set(
          data.enrollments.filter((e) => e.student_id === st.id).map((e) => e.subject_id),
        );
        const lectures = (data.lectures as Lecture[]).filter((l) => subjectIds.has(l.subject_id));
        return {
          student: st,
          summary: summarizeFrom(
            lectures,
            data.attendance.filter((a) => a.student_id === st.id),
          ),
        };
      })
      .sort((a, b) => (a.summary.percentage ?? 0) - (b.summary.percentage ?? 0));
  }, [data]);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="font-serif text-3xl tracking-tight">Attendance ranking</h1>
        {isPending || !data ? (
          <PageLoader />
        ) : rows.length === 0 ? (
          <EmptyState title="No students" body="No enrolled students for your subjects." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {rows.map(({ student, summary }) => (
              <div
                key={student.id}
                className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{student.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Roll {student.roll_number} · {summary.attended}/{summary.total} attended ·{" "}
                    {summary.percentage !== null && summary.percentage >= 80
                      ? `${summary.safeMisses} safe misses`
                      : `attend ${summary.recoveryLectures} to recover`}
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
      </div>
    </AppShell>
  );
}

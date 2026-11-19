import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { PageLoader, EmptyState } from "@/components/states";
import { studentDataQuery } from "@/lib/queries";
import { formatDay, formatTimeRange, type Lecture } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Attendance history — Attendo" },
      { name: "description", content: "Full lecture-by-lecture attendance history." },
      { property: "og:title", content: "Attendance history — Attendo" },
      {
        property: "og:description",
        content: "Every lecture, marked present, absent or cancelled.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data, isPending } = useQuery(studentDataQuery);

  const rows = useMemo(() => {
    if (!data) return [];
    const byLecture = new Map(data.attendance.map((a) => [a.lecture_id, a]));
    const subjects = new Map(data.subjects.map((s) => [s.id, s]));
    return (data.lectures as Lecture[])
      .filter((l) => l.status !== "scheduled")
      .map((l) => ({
        lecture: l,
        subject: subjects.get(l.subject_id),
        record: byLecture.get(l.id),
      }));
  }, [data]);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="font-serif text-3xl tracking-tight">Attendance history</h1>
        {isPending || !data ? (
          <PageLoader />
        ) : rows.length === 0 ? (
          <EmptyState title="No lectures yet" body="Conducted lectures will appear here." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {rows.map(({ lecture, subject, record }) => (
              <div
                key={lecture.id}
                className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{subject?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDay(lecture.lecture_date)} · {formatTimeRange(lecture)}
                    {lecture.topic ? ` · ${lecture.topic}` : ""}
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
        )}
      </div>
    </AppShell>
  );
}

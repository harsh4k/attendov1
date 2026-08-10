import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageLoader, EmptyState } from "@/components/states";
import { facultyDataQuery } from "@/lib/queries";
import { setAttendance, setLectureStatus } from "@/lib/api.functions";
import { formatDay, formatTimeRange, type Lecture } from "@/lib/domain";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/lectures")({
  head: () => ({
    meta: [
      { title: "Lectures — Attendo" },
      { name: "description", content: "Conduct lectures and correct attendance records." },
      { property: "og:title", content: "Lectures — Attendo" },
      { property: "og:description", content: "Faculty lecture and attendance management." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LecturesPage,
});

function LecturesPage() {
  const { data, isPending } = useQuery(facultyDataQuery);
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["faculty-data"] });

  const statusMutation = useMutation({
    mutationFn: (v: { id: string; status: "completed" | "cancelled" }) =>
      setLectureStatus({ data: v }),
    onSuccess: () => {
      toast.success("Lecture updated");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const attendanceMutation = useMutation({
    mutationFn: (v: { lectureId: string; studentId: string; status: "present" | "absent" }) =>
      setAttendance({ data: v }),
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const lectures = useMemo(() => {
    if (!data) return [];
    const subjects = new Map(data.subjects.map((s) => [s.id, s]));
    return (data.lectures as Lecture[]).slice(0, 60).map((l) => ({
      lecture: l,
      subject: subjects.get(l.subject_id),
    }));
  }, [data]);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <h1 className="font-serif text-3xl tracking-tight">Lectures</h1>
        {isPending || !data ? (
          <PageLoader />
        ) : lectures.length === 0 ? (
          <EmptyState title="No lectures" body="Lectures for your subjects will appear here." />
        ) : (
          <div className="space-y-3">
            {lectures.map(({ lecture, subject }) => {
              const roster = data.students.filter((st) =>
                data.enrollments.some(
                  (e) => e.student_id === st.id && e.subject_id === lecture.subject_id,
                ),
              );
              const marked = new Map(
                data.attendance
                  .filter((a) => a.lecture_id === lecture.id)
                  .map((a) => [a.student_id, a.status]),
              );
              const open = openId === lecture.id;
              return (
                <div
                  key={lecture.id}
                  className="rounded-xl border border-border bg-card shadow-[var(--shadow-soft)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{subject?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDay(lecture.lecture_date)} · {formatTimeRange(lecture)} ·{" "}
                        {lecture.status}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lecture.status !== "completed" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            statusMutation.mutate({ id: lecture.id, status: "completed" })
                          }
                        >
                          Mark conducted
                        </Button>
                      ) : null}
                      {lecture.status !== "cancelled" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            statusMutation.mutate({ id: lecture.id, status: "cancelled" })
                          }
                        >
                          Cancel
                        </Button>
                      ) : null}
                      <Button size="sm" onClick={() => setOpenId(open ? null : lecture.id)}>
                        {open ? "Close" : "Roster"}
                      </Button>
                    </div>
                  </div>
                  {open ? (
                    <div className="border-t border-border">
                      {roster.map((st) => {
                        const status = marked.get(st.id);
                        return (
                          <div
                            key={st.id}
                            className="flex items-center justify-between gap-4 border-b border-border px-5 py-2.5 last:border-0"
                          >
                            <p className="truncate text-sm">
                              {st.full_name}{" "}
                              <span className="text-xs text-muted-foreground">
                                {st.roll_number}
                              </span>
                            </p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant={status === "present" ? "default" : "outline"}
                                onClick={() =>
                                  attendanceMutation.mutate({
                                    lectureId: lecture.id,
                                    studentId: st.id,
                                    status: "present",
                                  })
                                }
                              >
                                Present
                              </Button>
                              <Button
                                size="sm"
                                variant={status === "absent" ? "destructive" : "outline"}
                                onClick={() =>
                                  attendanceMutation.mutate({
                                    lectureId: lecture.id,
                                    studentId: st.id,
                                    status: "absent",
                                  })
                                }
                              >
                                Absent
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}

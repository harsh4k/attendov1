import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { PageLoader } from "@/components/states";
import { adminDataQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Directory — Attendo" },
      { name: "description", content: "College directory of students, faculty and subjects." },
      { property: "og:title", content: "Directory — Attendo" },
      { property: "og:description", content: "Manage students, faculty and subjects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data, isPending } = useQuery(adminDataQuery);

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-8">
        <h1 className="font-serif text-3xl tracking-tight">Directory</h1>
        {isPending || !data ? (
          <PageLoader />
        ) : (
          <>
            <section className="space-y-3">
              <h2 className="font-serif text-xl tracking-tight">
                Students ({data.students.length})
              </h2>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                {data.students.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{s.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {s.roll_number} · Sem {s.semester} · Div {s.division}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl tracking-tight">Faculty ({data.faculty.length})</h2>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                {data.faculty.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{f.full_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{f.email}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {f.employee_id} · {f.department}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="font-serif text-xl tracking-tight">
                Subjects ({data.subjects.length})
              </h2>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                {data.subjects.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 last:border-0"
                  >
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    <span className="text-xs text-muted-foreground">
                      {s.code} · Sem {s.semester} · Div {s.division}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, LineChart, ShieldCheck, Target } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Attendo — College Attendance Management" },
      {
        name: "description",
        content:
          "Attendo tracks college attendance against the 80% requirement, with recovery targets, subject breakdowns and defaulter alerts for students and faculty.",
      },
      { property: "og:title", content: "Attendo — College Attendance Management" },
      {
        property: "og:description",
        content: "Live attendance percentages, recovery targets and defaulter tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="font-serif text-xl tracking-tight">Attendo</span>
        </div>
        <Link
          to="/auth"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Sign in
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12">
        <section className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Attendance management
          </p>
          <h1 className="mt-3 font-serif text-5xl leading-[1.05] tracking-tight text-foreground">
            Know exactly how many lectures stand between you and 80%.
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Students mark attendance in the two hours after each lecture. Faculty conduct lectures,
            correct records and see defaulters instantly. Every number is calculated from real
            lecture data.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Open your dashboard
            </Link>
            <Link
              to="/auth"
              className="rounded-md border border-input px-5 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
            >
              Try a demo account
            </Link>
          </div>
        </section>

        <section className="mt-20 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: <Target className="size-5" />,
              title: "Recovery targets",
              body: "The exact number of consecutive lectures needed to climb back above 80%.",
            },
            {
              icon: <LineChart className="size-5" />,
              title: "Subject breakdown",
              body: "Per-subject percentages, safe misses and trends across the semester.",
            },
            {
              icon: <ShieldCheck className="size-5" />,
              title: "Trusted records",
              body: "Marking windows and role-based access are enforced by the database itself.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]"
            >
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {f.icon}
              </span>
              <h2 className="mt-4 font-serif text-lg tracking-tight">{f.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

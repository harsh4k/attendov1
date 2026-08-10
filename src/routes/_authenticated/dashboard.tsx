import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { meQuery } from "@/lib/queries";
import { AppShell } from "@/components/app-shell";
import { StudentDashboard } from "@/components/student-dashboard";
import { StaffDashboard } from "@/components/staff-dashboard";
import { PageLoader, UnregisteredNotice } from "@/components/states";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Attendo Attendance" },
      {
        name: "description",
        content:
          "Live attendance percentage, recovery targets and today's lectures for students and faculty.",
      },
      { property: "og:title", content: "Dashboard — Attendo Attendance" },
      {
        property: "og:description",
        content: "Track the 80% attendance requirement with recovery guidance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data: me, isPending } = useQuery(meQuery);

  return (
    <AppShell>
      {isPending || !me ? (
        <PageLoader />
      ) : !me.registered ? (
        <UnregisteredNotice />
      ) : me.role === "student" ? (
        <StudentDashboard />
      ) : (
        <StaffDashboard role={me.role} name={me.profile.full_name} />
      )}
    </AppShell>
  );
}

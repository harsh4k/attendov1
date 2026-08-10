import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BookOpen,
  CalendarClock,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldAlert,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { meQuery } from "@/lib/queries";
import { markNotificationRead } from "@/lib/api.functions";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: ReactNode };

function navFor(role: string): NavItem[] {
  const dash = { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard className="size-4" /> };
  if (role === "student") {
    return [
      dash,
      { to: "/subjects", label: "Subjects", icon: <BookOpen className="size-4" /> },
      { to: "/history", label: "History", icon: <CalendarClock className="size-4" /> },
    ];
  }
  if (role === "faculty") {
    return [
      dash,
      { to: "/lectures", label: "Lectures", icon: <CalendarClock className="size-4" /> },
      { to: "/defaulters", label: "Defaulters", icon: <ShieldAlert className="size-4" /> },
    ];
  }
  return [
    dash,
    { to: "/lectures", label: "Lectures", icon: <CalendarClock className="size-4" /> },
    { to: "/defaulters", label: "Defaulters", icon: <ShieldAlert className="size-4" /> },
    { to: "/admin", label: "Directory", icon: <Users className="size-4" /> },
  ];
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { data: me } = useQuery(meQuery);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const role = me?.registered ? me.role : "student";
  const items = navFor(role);
  const notifications = me?.registered ? me.notifications : [];
  const unread = notifications.filter((n) => !n.read).length;

  const readMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["me"] }),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const brand = (
    <Link to="/dashboard" className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <GraduationCap className="size-5" />
      </span>
      <span className="leading-tight">
        <span className="block font-serif text-lg tracking-tight text-foreground">Attendo</span>
        <span className="block text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
          {role} workspace
        </span>
      </span>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-sidebar px-4 py-6 lg:flex">
        {brand}
        <div className="mt-8 flex-1">
          <NavLinks items={items} />
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="truncate text-sm font-medium text-foreground">
            {me?.registered ? me.profile.full_name : "—"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {me?.registered ? me.profile.email : ""}
          </p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start gap-2" onClick={signOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 bg-sidebar p-6">
                {brand}
                <div className="mt-8">
                  <NavLinks items={items} onNavigate={() => setOpen(false)} />
                </div>
                <Button variant="ghost" size="sm" className="mt-6 w-full justify-start gap-2" onClick={signOut}>
                  <LogOut className="size-4" /> Sign out
                </Button>
              </SheetContent>
            </Sheet>
            <span className="lg:hidden">{brand}</span>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <Bell className="size-5" />
                {unread > 0 ? (
                  <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                    {unread}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-medium">Notifications</p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted-foreground">You're all caught up.</p>
                ) : (
                  notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => !n.read && readMutation.mutate(n.id)}
                      className={cn(
                        "block w-full border-b border-border px-4 py-3 text-left transition-colors last:border-0 hover:bg-accent/60",
                        !n.read && "bg-primary/5",
                      )}
                    >
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                    </button>
                  ))
                )}
              </div>
            </PopoverContent>
          </Popover>
        </header>

        <main className="px-4 pb-16 pt-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}

import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Attendo Attendance" },
      {
        name: "description",
        content:
          "Sign in to Attendo to track college attendance, mark lectures and monitor the 80% requirement.",
      },
      { property: "og:title", content: "Sign in — Attendo Attendance" },
      {
        property: "og:description",
        content: "Access your student or faculty attendance workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const credsSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(160),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const DEMOS = [
  { label: "Student", email: "aman.patel@college.edu" },
  { label: "Defaulter student", email: "sara.khan@college.edu" },
  { label: "Faculty", email: "n.iyer@college.edu" },
  { label: "Admin", email: "admin@college.edu" },
];
const DEMO_PASSWORD = "attendo123";

function AuthPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function afterAuth() {
    await queryClient.invalidateQueries();
    navigate({ to: "/dashboard" });
  }

  async function signIn(mail: string, pass: string) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: mail, password: pass });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await afterAuth();
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid details");
      return;
    }
    await signIn(parsed.data.email, parsed.data.password);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    const parsed = credsSchema.safeParse({ email, password });
    if (!parsed.success || name.trim().length < 2) {
      toast.error(parsed.success ? "Enter your full name" : parsed.error.issues[0]!.message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name.trim() },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Account created");
    await afterAuth();
  }

  async function googleSignIn() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Google sign-in failed");
      return;
    }
    if (result.redirected) return;
    await afterAuth();
  }

  async function demoLogin(mail: string) {
    await signIn(mail, DEMO_PASSWORD);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="size-5" />
          </span>
          <span className="font-serif text-xl tracking-tight">Attendo</span>
        </div>
        <div className="max-w-md">
          <h1 className="font-serif text-4xl leading-[1.1] tracking-tight text-foreground">
            Attendance that tells you exactly what to do next.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Live percentages against the 80% requirement, recovery targets down to the lecture, and
            defaulter tracking for every division — in one calm workspace.
          </p>
        </div>
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Semester 5 · Division A
        </p>
      </div>

      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email2">College email</Label>
                  <Input
                    id="email2"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@college.edu"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password2">Password</Label>
                  <Input
                    id="password2"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="size-4 animate-spin" /> : "Create account"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Your account is linked to the college directory by email.
                </p>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={googleSignIn}>
            Continue with Google
          </Button>

          <div className="mt-8 rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Demo accounts
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMOS.map((d) => (
                <Button
                  key={d.email}
                  variant="secondary"
                  size="sm"
                  disabled={loading}
                  onClick={() => demoLogin(d.email)}
                >
                  {d.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

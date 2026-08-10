import { Loader2, MailQuestion } from "lucide-react";

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
      <p className="font-serif text-lg tracking-tight text-foreground">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

export function UnregisteredNotice() {
  return (
    <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-[var(--shadow-soft)]">
      <span className="mx-auto flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <MailQuestion className="size-5" />
      </span>
      <h1 className="mt-4 font-serif text-2xl tracking-tight">Account not in the directory</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your email isn't registered as a student or faculty member yet. Ask an administrator to add
        you to the directory with this exact email address, then sign in again.
      </p>
    </div>
  );
}

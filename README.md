# Attendo ("Project Revive")

A college attendance management system — students, faculty, and admins each get a dedicated dashboard for tracking lectures and attendance.

**Live:** https://attendov1.lovable.app

## Roles & Features

- **Students** — view enrolled subjects, attendance history, and defaulter status
- **Faculty** — manage subjects, schedule/run lectures, mark attendance
- **Admin** — oversee users, roles, subjects, and faculty assignments
- Role-based auth (`student` / `faculty` / `admin`) with row-level security in Postgres
- Data model: profiles, user roles, students, faculty, subjects, faculty-subject assignments, enrollments, lectures (scheduled/ongoing/completed/cancelled), attendance (present/absent), notifications

## Tech Stack

- Vite + React + TypeScript
- TanStack Start / TanStack Router + TanStack Query
- shadcn/ui (Radix primitives) + Tailwind CSS
- react-hook-form + Zod
- Supabase (Postgres, Auth, RLS)
- Bun

Built with [Lovable](https://lovable.dev) — every change made in the Lovable editor is committed straight to this repository, and pushes to `main` sync back into Lovable.

## Development

```sh
git clone https://github.com/harsh4k/attendov1.git
cd attendov1
bun install
bun run dev
```

Requires a Supabase project — see `supabase/config.toml` and the `supabase/migrations/` folder for the schema to apply.

## Continue in Lovable

[lovable.dev/projects/e05647d1-664e-4576-9c2e-ea55b762d8da](https://lovable.dev/projects/e05647d1-664e-4576-9c2e-ea55b762d8da)

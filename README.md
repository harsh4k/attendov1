# Attendo ("Project Revive")

A college attendance management system — students, faculty, and admins each get a dedicated dashboard for tracking lectures and attendance.

**Live:** https://attendov1.vercel.app/

## Roles & Features

- **Students** — view enrolled subjects, attendance history, and defaulter status. The attendance target is 80%. Students below 75% are flagged as defaulters.
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


## Development

Install [Bun](https://bun.sh/). Use a separate development Supabase project so local testing does not write to the hosted demo.

```sh
git clone https://github.com/harsh4k/attendov1.git
cd attendov1
bun install --frozen-lockfile
bun run dev
```

Apply the SQL files in [`supabase/migrations/`](supabase/migrations/) in filename order to the development project. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the browser, and `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for server-side session validation. Use demo accounts for each role to test the dashboards.

```sh
bun run lint
bun run build
```

## License

Attendo’s original application code is available under the [MIT License](LICENSE). Third-party packages and assets retain their own terms. The license covers application code, independent of student records or institutional data. See [third-party notices](THIRD-PARTY-NOTICES.md) for the included shadcn/ui components.

## Continue in Lovable

[lovable.dev/projects/e05647d1-664e-4576-9c2e-ea55b762d8da](https://lovable.dev/projects/e05647d1-664e-4576-9c2e-ea55b762d8da)

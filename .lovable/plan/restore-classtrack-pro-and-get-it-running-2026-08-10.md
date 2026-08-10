# Restore ClassTrack Pro and get it running

Your uploaded ZIP is a full export of the College Attendance Management System (ClassTrack Pro). This project is currently an empty starter — the app code isn't here at all, which is why nothing works. The fix is to restore the exported app into this project and stand up a fresh backend for it, since the old backend belongs to the original project and can't be reused here.

## What will be done

1. **Restore the app code** — copy every source file from the ZIP into this project: routes (home, sign-in, dashboard, subjects, lectures, history, defaulters, admin), the shared shell, dashboards, charts, UI components, the attendance math library, the cream/charcoal/orange design system, and config files. Git metadata and the old `.env` are not copied.

2. **Enable Lovable Cloud** — provisions this project's own database, auth and server runtime, and writes fresh connection settings.

3. **Recreate the database** — apply the two exported migrations: all tables (profiles, user_roles, students, faculty, subjects, faculty_subjects, enrollments, lectures, attendance, notifications), grants, row-level security policies, the `has_role()` function, and the seed data (subjects, ~8 students spanning safe / borderline / defaulter cases, faculty assignments, weeks of lectures including a cancelled one, and matching attendance).

4. **Recreate demo accounts** — the student / faculty / admin logins shown on the sign-in page, linked to the seeded profiles and roles.

5. **Verify it actually works** — build check, then a browser pass: sign in as each demo role and confirm the student dashboard percentages/ring, marking-window states, faculty lecture roster and defaulters list, and admin screens all load with real data. Any runtime errors found get fixed in the same pass.

## Technical notes

- Regenerated files (`routeTree.gen.ts`, lockfiles, `.env`) are left to the platform rather than copied from the ZIP, to avoid stale state.
- `src/integrations/supabase/types.ts` will be regenerated against the new database.
- Auth uses email/password with auto-confirm so demo accounts work immediately.
- The old project's backend URL/keys in the ZIP's `.env` are ignored; this project gets its own.

## Not included

Rows from the original project's database aren't transferable — you get the seed data defined in the migrations, not anything added after that export.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Resolves the signed-in user's directory profile, role and linked records. */
export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.rpc("link_account");

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, email, pending_role")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile) {
      return { registered: false as const };
    }

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);

    const role = (roles?.[0]?.role ?? profile.pending_role) as "student" | "faculty" | "admin";

    const { data: student } = await supabase
      .from("students")
      .select("id, roll_number, semester, division")
      .eq("profile_id", profile.id)
      .maybeSingle();

    const { data: faculty } = await supabase
      .from("faculty")
      .select("id, employee_id, department")
      .eq("profile_id", profile.id)
      .maybeSingle();

    const { data: notifications } = await supabase
      .from("notifications")
      .select("id, title, body, kind, read, created_at")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(20);

    return {
      registered: true as const,
      profile,
      role,
      student: student ?? null,
      faculty: faculty ?? null,
      notifications: notifications ?? [],
    };
  });

/** Everything a student needs: their subjects, lectures and attendance rows. */
export const getStudentData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Profile not found");

    const { data: student } = await supabase
      .from("students")
      .select("id, roll_number, semester, division")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (!student) throw new Error("No student record for this account");

    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("subject_id")
      .eq("student_id", student.id);
    const subjectIds = (enrollments ?? []).map((e) => e.subject_id);

    if (subjectIds.length === 0) {
      return { student, subjects: [], lectures: [], attendance: [] };
    }

    const { data: subjects } = await supabase
      .from("subjects")
      .select("id, name, code, semester, division")
      .in("id", subjectIds)
      .order("code");

    const { data: fs } = await supabase
      .from("faculty_subjects")
      .select("subject_id, faculty:faculty_id(profile:profile_id(full_name))")
      .in("subject_id", subjectIds);

    const facultyBySubject = new Map<string, string>();
    for (const row of (fs ?? []) as unknown as Array<{
      subject_id: string;
      faculty: { profile: { full_name: string } | null } | null;
    }>) {
      if (row.faculty?.profile?.full_name) {
        facultyBySubject.set(row.subject_id, row.faculty.profile.full_name);
      }
    }

    const { data: lectures } = await supabase
      .from("lectures")
      .select("id, subject_id, faculty_id, lecture_date, start_time, end_time, topic, status")
      .in("subject_id", subjectIds)
      .order("lecture_date", { ascending: false });

    const { data: attendance } = await supabase
      .from("attendance")
      .select("id, student_id, lecture_id, status, marked_at")
      .eq("student_id", student.id);

    return {
      student,
      subjects: (subjects ?? []).map((s) => ({
        ...s,
        faculty_name: facultyBySubject.get(s.id) ?? null,
      })),
      lectures: lectures ?? [],
      attendance: attendance ?? [],
    };
  });

/** Student self-marking. All rules are enforced again by the database trigger. */
export const markAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lectureId: string }) =>
    z.object({ lectureId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Profile not found");
    const { data: student } = await supabase
      .from("students")
      .select("id")
      .eq("profile_id", profile.id)
      .maybeSingle();
    if (!student) throw new Error("No student record for this account");

    const { data: row, error } = await supabase
      .from("attendance")
      .insert({
        student_id: student.id,
        lecture_id: data.lectureId,
        status: "present",
        marked_by: userId,
      })
      .select("id, student_id, lecture_id, status, marked_at")
      .single();

    if (error) {
      if (error.code === "23505") throw new Error("Attendance already marked for this lecture");
      throw new Error(error.message);
    }
    return row;
  });

/** Faculty view: subjects taught, their lectures, enrolled students and attendance. */
export const getFacultyData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();
    if (!profile) throw new Error("Profile not found");

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");

    const { data: faculty } = await supabase
      .from("faculty")
      .select("id, employee_id, department")
      .eq("profile_id", profile.id)
      .maybeSingle();

    let subjectIds: string[] = [];
    if (isAdmin) {
      const { data: all } = await supabase.from("subjects").select("id");
      subjectIds = (all ?? []).map((s) => s.id);
    } else {
      if (!faculty) throw new Error("No faculty record for this account");
      const { data: fs } = await supabase
        .from("faculty_subjects")
        .select("subject_id")
        .eq("faculty_id", faculty.id);
      subjectIds = (fs ?? []).map((r) => r.subject_id);
    }

    if (subjectIds.length === 0) {
      return {
        faculty: faculty ?? null,
        subjects: [],
        lectures: [],
        students: [],
        attendance: [],
        enrollments: [],
      };
    }

    const { data: subjects } = await supabase
      .from("subjects")
      .select("id, name, code, semester, division")
      .in("id", subjectIds)
      .order("code");

    const { data: lectures } = await supabase
      .from("lectures")
      .select("id, subject_id, faculty_id, lecture_date, start_time, end_time, topic, status")
      .in("subject_id", subjectIds)
      .order("lecture_date", { ascending: false });

    const { data: enrollments } = await supabase
      .from("enrollments")
      .select("student_id, subject_id")
      .in("subject_id", subjectIds);

    const studentIds = Array.from(new Set((enrollments ?? []).map((e) => e.student_id)));

    const { data: studentRows } = await supabase
      .from("students")
      .select("id, roll_number, semester, division, profile:profile_id(full_name, email)")
      .in("id", studentIds.length ? studentIds : ["00000000-0000-0000-0000-000000000000"]);

    const lectureIds = (lectures ?? []).map((l) => l.id);
    const { data: attendance } = await supabase
      .from("attendance")
      .select("id, student_id, lecture_id, status, marked_at")
      .in("lecture_id", lectureIds.length ? lectureIds : ["00000000-0000-0000-0000-000000000000"]);

    return {
      faculty: faculty ?? null,
      subjects: subjects ?? [],
      lectures: lectures ?? [],
      enrollments: enrollments ?? [],
      students: (
        (studentRows ?? []) as unknown as Array<{
          id: string;
          roll_number: string;
          semester: number;
          division: string;
          profile: { full_name: string; email: string } | null;
        }>
      ).map((s) => ({
        id: s.id,
        roll_number: s.roll_number,
        semester: s.semester,
        division: s.division,
        full_name: s.profile?.full_name ?? "Unknown",
        email: s.profile?.email ?? "",
      })),
      attendance: attendance ?? [],
    };
  });

/** Faculty/admin correction of a single attendance record. */
export const setAttendance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { lectureId: string; studentId: string; status: "present" | "absent" }) =>
    z
      .object({
        lectureId: z.string().uuid(),
        studentId: z.string().uuid(),
        status: z.enum(["present", "absent"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("attendance")
      .select("id")
      .eq("lecture_id", data.lectureId)
      .eq("student_id", data.studentId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("attendance")
        .update({ status: data.status, marked_by: userId, marked_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("attendance").insert({
        lecture_id: data.lectureId,
        student_id: data.studentId,
        status: data.status,
        marked_by: userId,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const saveLecture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string;
      subjectId: string;
      date: string;
      startTime: string;
      endTime: string;
      topic?: string;
      status?: "scheduled" | "ongoing" | "completed" | "cancelled";
    }) =>
      z
        .object({
          id: z.string().uuid().optional(),
          subjectId: z.string().uuid(),
          date: z.string().min(8),
          startTime: z.string().min(4),
          endTime: z.string().min(4),
          topic: z.string().max(160).optional(),
          status: z.enum(["scheduled", "ongoing", "completed", "cancelled"]).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: faculty } = await supabase
      .from("faculty")
      .select("id, profile:profile_id(user_id)")
      .limit(200);
    const facultyId =
      (
        (faculty ?? []) as unknown as Array<{ id: string; profile: { user_id: string } | null }>
      ).find((f) => f.profile?.user_id === context.userId)?.id ?? null;

    const payload = {
      subject_id: data.subjectId,
      lecture_date: data.date,
      start_time: data.startTime,
      end_time: data.endTime,
      topic: data.topic ?? null,
      status: data.status ?? "scheduled",
      ...(facultyId ? { faculty_id: facultyId } : {}),
    };

    if (data.id) {
      const { error } = await supabase.from("lectures").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabase
      .from("lectures")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const setLectureStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: { id: string; status: "scheduled" | "ongoing" | "completed" | "cancelled" }) =>
      z
        .object({
          id: z.string().uuid(),
          status: z.enum(["scheduled", "ongoing", "completed", "cancelled"]),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("lectures")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: full directory of people and subjects. */
export const getAdminData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r) => r.role === "admin")) throw new Error("Forbidden");

    const [
      { data: students },
      { data: faculty },
      { data: subjects },
      { data: lectures },
      { data: fs },
    ] = await Promise.all([
      supabase
        .from("students")
        .select("id, roll_number, semester, division, profile:profile_id(full_name, email)")
        .order("roll_number"),
      supabase
        .from("faculty")
        .select("id, employee_id, department, profile:profile_id(full_name, email)")
        .order("employee_id"),
      supabase.from("subjects").select("id, name, code, semester, division").order("code"),
      supabase
        .from("lectures")
        .select("id, subject_id, faculty_id, lecture_date, start_time, end_time, topic, status")
        .order("lecture_date", { ascending: false })
        .limit(300),
      supabase.from("faculty_subjects").select("faculty_id, subject_id"),
    ]);

    return {
      students: (
        (students ?? []) as unknown as Array<{
          id: string;
          roll_number: string;
          semester: number;
          division: string;
          profile: { full_name: string; email: string } | null;
        }>
      ).map((s) => ({
        id: s.id,
        roll_number: s.roll_number,
        semester: s.semester,
        division: s.division,
        full_name: s.profile?.full_name ?? "",
        email: s.profile?.email ?? "",
      })),
      faculty: (
        (faculty ?? []) as unknown as Array<{
          id: string;
          employee_id: string;
          department: string;
          profile: { full_name: string; email: string } | null;
        }>
      ).map((f) => ({
        id: f.id,
        employee_id: f.employee_id,
        department: f.department,
        full_name: f.profile?.full_name ?? "",
        email: f.profile?.email ?? "",
      })),
      subjects: subjects ?? [],
      lectures: lectures ?? [],
      facultySubjects: fs ?? [],
    };
  });

export const createSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string; code: string; semester: number; division: string }) =>
    z
      .object({
        name: z.string().trim().min(2).max(80),
        code: z.string().trim().min(2).max(16),
        semester: z.number().int().min(1).max(10),
        division: z.string().trim().min(1).max(4),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("subjects").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: register a person in the directory so they can sign up and be linked. */
export const createDirectoryEntry = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      fullName: string;
      email: string;
      role: "student" | "faculty";
      rollNumber?: string;
      employeeId?: string;
      semester?: number;
      division?: string;
    }) =>
      z
        .object({
          fullName: z.string().trim().min(2).max(80),
          email: z.string().trim().email().max(160),
          role: z.enum(["student", "faculty"]),
          rollNumber: z.string().trim().max(16).optional(),
          employeeId: z.string().trim().max(16).optional(),
          semester: z.number().int().min(1).max(10).optional(),
          division: z.string().trim().max(4).optional(),
        })
        .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: profile, error } = await supabase
      .from("profiles")
      .insert({
        full_name: data.fullName,
        email: data.email.toLowerCase(),
        pending_role: data.role,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    if (data.role === "student") {
      const { error: sErr } = await supabase.from("students").insert({
        profile_id: profile.id,
        roll_number: data.rollNumber || `A${Math.floor(100 + Math.random() * 900)}`,
        semester: data.semester ?? 5,
        division: data.division ?? "A",
      });
      if (sErr) throw new Error(sErr.message);
      const { data: subjects } = await supabase.from("subjects").select("id");
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("profile_id", profile.id)
        .single();
      if (student && subjects?.length) {
        await supabase
          .from("enrollments")
          .insert(subjects.map((s) => ({ student_id: student.id, subject_id: s.id })));
      }
    } else {
      const { error: fErr } = await supabase.from("faculty").insert({
        profile_id: profile.id,
        employee_id: data.employeeId || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      });
      if (fErr) throw new Error(fErr.message);
    }
    return { ok: true };
  });

export const markNotificationRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase.from("notifications").update({ read: true }).eq("id", data.id);
    return { ok: true };
  });

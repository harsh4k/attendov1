
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('student','faculty','admin');
CREATE TYPE public.lecture_status AS ENUM ('scheduled','ongoing','completed','cancelled');
CREATE TYPE public.attendance_status AS ENUM ('present','absent');

-- PROFILES (directory; user_id links to an auth account once the person signs up)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  pending_role public.app_role NOT NULL DEFAULT 'student',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  roll_number text NOT NULL UNIQUE,
  semester int NOT NULL DEFAULT 5,
  division text NOT NULL DEFAULT 'A',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT ALL ON public.students TO service_role;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.faculty (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id text NOT NULL UNIQUE,
  department text NOT NULL DEFAULT 'Computer Engineering',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty TO authenticated;
GRANT ALL ON public.faculty TO service_role;
ALTER TABLE public.faculty ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  semester int NOT NULL DEFAULT 5,
  division text NOT NULL DEFAULT 'A',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT ALL ON public.subjects TO service_role;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.faculty_subjects (
  faculty_id uuid NOT NULL REFERENCES public.faculty(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (faculty_id, subject_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.faculty_subjects TO authenticated;
GRANT ALL ON public.faculty_subjects TO service_role;
ALTER TABLE public.faculty_subjects ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.enrollments (
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  PRIMARY KEY (student_id, subject_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT ALL ON public.enrollments TO service_role;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.lectures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  faculty_id uuid REFERENCES public.faculty(id) ON DELETE SET NULL,
  lecture_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  topic text,
  status public.lecture_status NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lectures_subject_idx ON public.lectures(subject_id, lecture_date);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lectures TO authenticated;
GRANT ALL ON public.lectures TO service_role;
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  lecture_id uuid NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL DEFAULT 'present',
  marked_at timestamptz NOT NULL DEFAULT now(),
  marked_by uuid,
  UNIQUE (student_id, lecture_id)
);
CREATE INDEX attendance_student_idx ON public.attendance(student_id);
CREATE INDEX attendance_lecture_idx ON public.attendance(lecture_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  kind text NOT NULL DEFAULT 'info',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_student_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id FROM public.students s
  JOIN public.profiles p ON p.id = s.profile_id
  WHERE p.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_faculty_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id FROM public.faculty f
  JOIN public.profiles p ON p.id = f.profile_id
  WHERE p.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.faculty_teaches(_subject_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.faculty_subjects fs
    WHERE fs.subject_id = _subject_id AND fs.faculty_id = public.current_faculty_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_enrolled(_student_id uuid, _subject_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.enrollments e WHERE e.student_id = _student_id AND e.subject_id = _subject_id);
$$;

-- Links the signed-in auth user to their directory profile and grants their role.
CREATE OR REPLACE FUNCTION public.link_account()
RETURNS public.app_role LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  _profile public.profiles;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  SELECT * INTO _profile FROM public.profiles WHERE user_id = _uid;
  IF _profile.id IS NULL AND _email <> '' THEN
    UPDATE public.profiles SET user_id = _uid
    WHERE lower(email) = _email AND user_id IS NULL
    RETURNING * INTO _profile;
  END IF;

  IF _profile.id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (_uid, _profile.pending_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN _profile.pending_role;
END;
$$;

-- Attendance integrity: students may only insert their own row, for a completed,
-- non-cancelled lecture of a subject they are enrolled in, within 2h of the end.
CREATE OR REPLACE FUNCTION public.enforce_attendance_rules()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _lec public.lectures;
  _is_admin boolean := public.has_role(auth.uid(), 'admin');
  _self uuid := public.current_student_id();
BEGIN
  -- trusted server/seed context (no end-user session) bypasses the student rules
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO _lec FROM public.lectures WHERE id = NEW.lecture_id;
  IF _lec.id IS NULL THEN RAISE EXCEPTION 'Lecture not found'; END IF;
  IF _lec.status = 'cancelled' THEN RAISE EXCEPTION 'Lecture was cancelled'; END IF;
  IF NOT public.is_enrolled(NEW.student_id, _lec.subject_id) THEN
    RAISE EXCEPTION 'Student is not enrolled in this subject';
  END IF;

  IF _is_admin OR public.faculty_teaches(_lec.subject_id) THEN
    RETURN NEW;
  END IF;

  IF _self IS NULL OR NEW.student_id <> _self THEN
    RAISE EXCEPTION 'You can only mark your own attendance';
  END IF;
  IF _lec.status <> 'completed' THEN
    RAISE EXCEPTION 'Attendance opens after the lecture ends';
  END IF;
  IF (_lec.lecture_date + _lec.end_time) > (now() AT TIME ZONE 'utc') THEN
    RAISE EXCEPTION 'Attendance opens after the lecture ends';
  END IF;
  IF (now() AT TIME ZONE 'utc') > (_lec.lecture_date + _lec.end_time + interval '2 hours') THEN
    RAISE EXCEPTION 'Attendance window closed';
  END IF;
  NEW.status := 'present';
  NEW.marked_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER attendance_rules BEFORE INSERT ON public.attendance
FOR EACH ROW EXECUTE FUNCTION public.enforce_attendance_rules();

-- POLICIES
CREATE POLICY "read own profile" ON public.profiles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));
CREATE POLICY "admins manage profiles" ON public.profiles FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "read students" ON public.students FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty') OR id = public.current_student_id());
CREATE POLICY "admins manage students" ON public.students FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "read faculty" ON public.faculty FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage faculty" ON public.faculty FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "read subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage subjects" ON public.subjects FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "read faculty_subjects" ON public.faculty_subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "admins manage faculty_subjects" ON public.faculty_subjects FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "read enrollments" ON public.enrollments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty') OR student_id = public.current_student_id());
CREATE POLICY "admins manage enrollments" ON public.enrollments FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "read lectures" ON public.lectures FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR public.faculty_teaches(subject_id)
  OR public.is_enrolled(public.current_student_id(), subject_id)
);
CREATE POLICY "faculty manage own lectures" ON public.lectures FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.faculty_teaches(subject_id))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.faculty_teaches(subject_id));

CREATE POLICY "read attendance" ON public.attendance FOR SELECT TO authenticated
USING (
  student_id = public.current_student_id()
  OR public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.lectures l WHERE l.id = lecture_id AND public.faculty_teaches(l.subject_id))
);
CREATE POLICY "insert attendance" ON public.attendance FOR INSERT TO authenticated
WITH CHECK (
  student_id = public.current_student_id()
  OR public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.lectures l WHERE l.id = lecture_id AND public.faculty_teaches(l.subject_id))
);
CREATE POLICY "staff update attendance" ON public.attendance FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.lectures l WHERE l.id = lecture_id AND public.faculty_teaches(l.subject_id)))
WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.lectures l WHERE l.id = lecture_id AND public.faculty_teaches(l.subject_id)));
CREATE POLICY "staff delete attendance" ON public.attendance FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.lectures l WHERE l.id = lecture_id AND public.faculty_teaches(l.subject_id)));

CREATE POLICY "read own notifications" ON public.notifications FOR SELECT TO authenticated
USING (profile_id = public.current_profile_id() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated
USING (profile_id = public.current_profile_id()) WITH CHECK (profile_id = public.current_profile_id());
CREATE POLICY "staff create notifications" ON public.notifications FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'))
WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'faculty'));

-- ============ SEED DATA ============
INSERT INTO public.profiles (email, full_name, pending_role) VALUES
 ('admin@college.edu','Registrar Office','admin'),
 ('anita.rao@college.edu','Dr. Anita Rao','faculty'),
 ('vikram.mehta@college.edu','Prof. Vikram Mehta','faculty'),
 ('sneha.iyer@college.edu','Dr. Sneha Iyer','faculty'),
 ('harsh.chauhan@college.edu','Harsh Chauhan','student'),
 ('rahul.sharma@college.edu','Rahul Sharma','student'),
 ('aman.patel@college.edu','Aman Patel','student'),
 ('priya.nair@college.edu','Priya Nair','student'),
 ('sara.khan@college.edu','Sara Khan','student'),
 ('dev.joshi@college.edu','Dev Joshi','student'),
 ('meera.pillai@college.edu','Meera Pillai','student'),
 ('kabir.singh@college.edu','Kabir Singh','student');

INSERT INTO public.faculty (profile_id, employee_id, department)
SELECT id, 'EMP-' || upper(substr(md5(email),1,4)), 'Computer Engineering'
FROM public.profiles WHERE pending_role = 'faculty';

INSERT INTO public.students (profile_id, roll_number, semester, division)
SELECT p.id, 'A' || (100 + row_number() OVER (ORDER BY p.full_name))::text, 5, 'A'
FROM public.profiles p WHERE p.pending_role = 'student';

INSERT INTO public.subjects (name, code, semester, division) VALUES
 ('Data Structures','CS301',5,'A'),
 ('Database Management Systems','CS302',5,'A'),
 ('Operating Systems','CS303',5,'A'),
 ('Computer Networks','CS304',5,'A'),
 ('Web Development','CS305',5,'A');

-- assign faculty to subjects
INSERT INTO public.faculty_subjects (faculty_id, subject_id)
SELECT f.id, s.id FROM public.faculty f
JOIN public.profiles p ON p.id = f.profile_id
JOIN public.subjects s ON (
  (p.email='anita.rao@college.edu' AND s.code IN ('CS301','CS302')) OR
  (p.email='vikram.mehta@college.edu' AND s.code IN ('CS303','CS304')) OR
  (p.email='sneha.iyer@college.edu' AND s.code IN ('CS305'))
);

-- everyone enrolled in all subjects
INSERT INTO public.enrollments (student_id, subject_id)
SELECT st.id, s.id FROM public.students st CROSS JOIN public.subjects s;

-- lectures: 3 per week per subject over the last 7 weeks
DO $$
DECLARE
  s record;
  f uuid;
  d date;
  i int;
  slot record;
  starts time[] := ARRAY['09:00','10:00','11:00','14:00','15:00']::time[];
  idx int := 0;
  _status public.lecture_status;
BEGIN
  FOR s IN SELECT * FROM public.subjects ORDER BY code LOOP
    idx := idx + 1;
    SELECT fs.faculty_id INTO f FROM public.faculty_subjects fs WHERE fs.subject_id = s.id LIMIT 1;
    FOR i IN 0..20 LOOP
      d := (CURRENT_DATE - (i * 2));
      IF extract(dow from d) IN (0,6) THEN CONTINUE; END IF;
      _status := 'completed';
      IF i = 5 THEN _status := 'cancelled'; END IF;
      INSERT INTO public.lectures (subject_id, faculty_id, lecture_date, start_time, end_time, topic, status)
      VALUES (s.id, f, d, starts[idx], starts[idx] + interval '1 hour',
              s.name || ' — Session ' || (21 - i), _status);
    END LOOP;
    -- a lecture that just ended today (open for marking) and one still upcoming
    INSERT INTO public.lectures (subject_id, faculty_id, lecture_date, start_time, end_time, topic, status)
    VALUES (s.id, f, CURRENT_DATE,
            ((now() AT TIME ZONE 'utc')::time - interval '90 minutes'),
            ((now() AT TIME ZONE 'utc')::time - interval '30 minutes'),
            s.name || ' — Today''s session', 'completed');
    INSERT INTO public.lectures (subject_id, faculty_id, lecture_date, start_time, end_time, topic, status)
    VALUES (s.id, f, CURRENT_DATE,
            ((now() AT TIME ZONE 'utc')::time + interval '2 hours'),
            ((now() AT TIME ZONE 'utc')::time + interval '3 hours'),
            s.name || ' — Upcoming session', 'scheduled');
  END LOOP;
END $$;

-- attendance for past completed lectures, with per-student target ratios
DO $$
DECLARE
  st record;
  ratio numeric;
  rn int;
  lec record;
  ratios numeric[] := ARRAY[0.95,0.92,0.86,0.80,0.78,0.74,0.66,0.52];
  k int := 0;
  present boolean;
BEGIN
  FOR st IN SELECT s.id, p.full_name FROM public.students s JOIN public.profiles p ON p.id = s.profile_id ORDER BY p.full_name LOOP
    k := k + 1;
    ratio := ratios[((k - 1) % 8) + 1];
    rn := 0;
    FOR lec IN
      SELECT l.id FROM public.lectures l
      WHERE l.status = 'completed' AND l.lecture_date < CURRENT_DATE
      ORDER BY l.subject_id, l.lecture_date
    LOOP
      rn := rn + 1;
      present := floor(rn * ratio) > floor((rn - 1) * ratio);
      INSERT INTO public.attendance (student_id, lecture_id, status, marked_at)
      VALUES (st.id, lec.id, CASE WHEN present THEN 'present' ELSE 'absent' END::public.attendance_status, now())
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

INSERT INTO public.notifications (profile_id, title, body, kind)
SELECT p.id, 'Attendance below 80%', 'Your overall attendance has dropped below the 80% requirement. Check your recovery plan.', 'warning'
FROM public.profiles p WHERE p.email IN ('sara.khan@college.edu','dev.joshi@college.edu','meera.pillai@college.edu','kabir.singh@college.edu');

INSERT INTO public.notifications (profile_id, title, body, kind)
SELECT p.id, 'You are above 80%', 'Great work — your attendance is comfortably above the requirement.', 'success'
FROM public.profiles p WHERE p.email IN ('harsh.chauhan@college.edu','rahul.sharma@college.edu','aman.patel@college.edu');

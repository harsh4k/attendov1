REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_profile_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_student_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_faculty_id() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.faculty_teaches(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_enrolled(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_attendance_rules() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_account() FROM anon;
GRANT EXECUTE ON FUNCTION public.link_account() TO authenticated;
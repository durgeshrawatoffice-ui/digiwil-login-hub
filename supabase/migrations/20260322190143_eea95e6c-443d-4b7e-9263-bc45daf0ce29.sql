
-- Assign admin role to existing users who are not team members
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.team_members tm
  WHERE lower(trim(tm.member_email)) = lower(trim(u.email))
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Assign team_member role to existing users who are team members
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'team_member'::app_role
FROM auth.users u
WHERE EXISTS (
  SELECT 1 FROM public.team_members tm
  WHERE lower(trim(tm.member_email)) = lower(trim(u.email))
)
ON CONFLICT (user_id, role) DO NOTHING;

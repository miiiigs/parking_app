-- Replace the email below with the Supabase Auth email for your first admin user.
insert into admin_user_roles (user_id, role, display_name)
select id, 'admin', 'Primary Admin'
from auth.users
where email = 'admin@example.com'
on conflict (user_id) do update
set role = excluded.role,
    display_name = excluded.display_name;
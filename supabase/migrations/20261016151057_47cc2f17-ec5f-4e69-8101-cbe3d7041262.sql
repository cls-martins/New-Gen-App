alter table public.profiles add column if not exists verified boolean not null default false;
create or replace function public.protect_profile_fields() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
 if not public.has_role(auth.uid(),'admin') and auth.role() <> 'service_role' then
   new.plan=old.plan; new.status=old.status; new.verified=old.verified;
 end if; return new; end $$;
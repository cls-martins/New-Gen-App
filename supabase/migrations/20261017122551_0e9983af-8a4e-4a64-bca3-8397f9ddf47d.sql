create table public.blacklist(
 id uuid primary key default gen_random_uuid(),
 kind text not null, value text not null, reason text, user_id uuid,
 created_at timestamptz not null default now(), unique(kind,value));
grant select, insert, delete on public.blacklist to authenticated; grant all on public.blacklist to service_role;
alter table public.blacklist enable row level security;
create policy "admin manage blacklist" on public.blacklist for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

alter table public.profiles add column if not exists avatar_frame text not null default 'none',
 add column if not exists banner_frame text not null default 'none',
 add column if not exists comment_style text not null default 'none';
alter table public.posts add column if not exists pinned_at timestamptz,
 add column if not exists views integer not null default 0;

create or replace function public.protect_profile_fields() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
 if not public.has_role(auth.uid(),'admin') and auth.role() <> 'service_role' then
   new.plan=old.plan; new.status=old.status; new.verified=old.verified;
 end if;
 if new.plan <> 'premium' then
   new.name_effect='none'; new.avatar_frame='none'; new.banner_frame='none'; new.comment_style='none';
 end if;
 return new; end $$;

create or replace function public.protect_post_fields() returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
 if auth.role() <> 'service_role' then new.views = old.views; end if;
 if new.pinned_at is not null and old.pinned_at is null then
   if (select plan from public.profiles where id=new.author_id) <> 'premium' then raise exception 'Apenas Premium pode fixar posts'; end if;
   if (select count(*) from public.posts where author_id=new.author_id and pinned_at is not null) >= 3 then raise exception 'Limite de 3 posts fixados'; end if;
 end if;
 return new; end $$;
create trigger posts_protect before update on public.posts for each row execute function public.protect_post_fields();

create or replace function public.register_post_view(_post uuid) returns void language sql security definer set search_path=public as $$
 update public.posts set views = views + 1 where id=_post and removed=false and author_id <> auth.uid();
$$;
revoke execute on function public.register_post_view(uuid) from public, anon;
grant execute on function public.register_post_view(uuid) to authenticated;

create or replace function public.is_blacklisted(_email text, _phone text) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.blacklist where (kind='email' and value=lower(trim(_email))) or (kind='phone' and _phone is not null and value=regexp_replace(_phone,'\D','','g')))
$$;
revoke execute on function public.is_blacklisted(text,text) from public;
grant execute on function public.is_blacklisted(text,text) to anon, authenticated;

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare uname text;
begin
 if public.is_blacklisted(new.email, new.raw_user_meta_data->>'phone') then raise exception 'Cadastro bloqueado'; end if;
 uname := lower(coalesce(new.raw_user_meta_data->>'username', 'user'||substr(new.id::text,1,8)));
 insert into public.profiles(id,username,display_name,phone,avatar_url)
 values(new.id, uname, coalesce(new.raw_user_meta_data->>'display_name',uname), new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'avatar_url');
 insert into public.user_roles(user_id,role) values(new.id,'user');
 if lower(new.email)='cadecandidomartins@gmail.com' then insert into public.user_roles(user_id,role) values(new.id,'admin'); end if;
 return new; end $$;

create or replace function public.admin_ban_user(_uid uuid, _reason text) returns void language plpgsql security definer set search_path=public as $$
declare em text; ph text;
begin
 if not public.has_role(auth.uid(),'admin') then raise exception 'Forbidden'; end if;
 if _uid = auth.uid() then raise exception 'Não pode banir a si mesmo'; end if;
 select email into em from auth.users where id=_uid;
 select phone into ph from public.profiles where id=_uid;
 update public.profiles set status='banned' where id=_uid;
 if em is not null then insert into public.blacklist(kind,value,reason,user_id) values('email',lower(em),_reason,_uid) on conflict do nothing; end if;
 if ph is not null and ph <> '' then insert into public.blacklist(kind,value,reason,user_id) values('phone',regexp_replace(ph,'\D','','g'),_reason,_uid) on conflict do nothing; end if;
 insert into public.blacklist(kind,value,reason,user_id) select 'ip',ip,_reason,_uid from public.login_ips where user_id=_uid on conflict do nothing;
 insert into public.blocked_ips(ip,reason,blocked_by) select ip,_reason,auth.uid() from public.login_ips where user_id=_uid on conflict do nothing;
 delete from auth.sessions where user_id=_uid;
end $$;
revoke execute on function public.admin_ban_user(uuid,text) from public, anon;
grant execute on function public.admin_ban_user(uuid,text) to authenticated;
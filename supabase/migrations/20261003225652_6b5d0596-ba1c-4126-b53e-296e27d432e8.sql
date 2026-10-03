
create type public.app_role as enum ('admin','moderator','user');
create type public.plan_type as enum ('free','premium');

create or replace function public.update_updated_at_column() returns trigger language plpgsql set search_path=public as $$ begin new.updated_at=now(); return new; end $$;

create table public.profiles(
 id uuid primary key references auth.users(id) on delete cascade,
 username text not null unique check (username ~ '^[a-z0-9_.]{3,24}$'),
 display_name text not null,
 phone text,
 bio text default '',
 avatar_url text, banner_url text,
 banner_color text default '#5a0d14',
 avatar_border_color text default '#c1121f',
 plan plan_type not null default 'free',
 name_effect text default 'none',
 theme text not null default 'dark',
 status text not null default 'active',
 allow_messages boolean not null default true,
 notification_prefs jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create trigger profiles_upd before update on public.profiles for each row execute function public.update_updated_at_column();

create table public.user_roles(id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role app_role not null, unique(user_id,role));
grant select on public.user_roles to authenticated; grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid,_role app_role) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create policy "own roles" on public.user_roles for select to authenticated using (user_id=auth.uid());

-- profile policies; protect plan/status from self edits
create policy "profiles readable" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated using (id=auth.uid() or public.has_role(auth.uid(),'admin')) with check (id=auth.uid() or public.has_role(auth.uid(),'admin'));
create or replace function public.protect_profile_fields() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if not public.has_role(auth.uid(),'admin') and auth.role() <> 'service_role' then
   new.plan=old.plan; new.status=old.status;
 end if; return new; end $$;
create trigger profiles_protect before update on public.profiles for each row execute function public.protect_profile_fields();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
declare uname text;
begin
 uname := lower(coalesce(new.raw_user_meta_data->>'username', 'user'||substr(new.id::text,1,8)));
 insert into public.profiles(id,username,display_name,phone,avatar_url)
 values(new.id, uname, coalesce(new.raw_user_meta_data->>'display_name',uname), new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'avatar_url');
 insert into public.user_roles(user_id,role) values(new.id,'user');
 if lower(new.email)='cadecandidomartins@gmail.com' then insert into public.user_roles(user_id,role) values(new.id,'admin'); end if;
 return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.username_available(_u text) returns boolean language sql stable security definer set search_path=public as $$ select not exists(select 1 from public.profiles where username=lower(_u)) $$;
grant execute on function public.username_available(text) to anon, authenticated;

create table public.plan_limits(plan plan_type primary key, daily_posts int not null);
insert into public.plan_limits values ('free',6),('premium',30);
grant select on public.plan_limits to authenticated; grant all on public.plan_limits to service_role;
alter table public.plan_limits enable row level security;
create policy "limits readable" on public.plan_limits for select to authenticated using (true);

create table public.posts(
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.profiles(id) on delete cascade,
 content text default '' check (char_length(content)<=2000),
 removed boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index on public.posts(created_at desc); create index on public.posts(author_id, created_at desc);
grant select, insert, update, delete on public.posts to authenticated; grant all on public.posts to service_role;
alter table public.posts enable row level security;
create policy "posts read" on public.posts for select to authenticated using (not removed or author_id=auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "posts insert" on public.posts for insert to authenticated with check (author_id=auth.uid());
create policy "posts update" on public.posts for update to authenticated using (author_id=auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "posts delete" on public.posts for delete to authenticated using (author_id=auth.uid() or public.has_role(auth.uid(),'admin'));
create trigger posts_upd before update on public.posts for each row execute function public.update_updated_at_column();

create or replace function public.posts_today(_uid uuid) returns int language sql stable security definer set search_path=public as $$
 select count(*)::int from public.posts where author_id=_uid and created_at >= date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo' $$;
create or replace function public.enforce_post_limit() returns trigger language plpgsql security definer set search_path=public as $$
declare lim int; st text;
begin
 select pl.daily_posts, p.status into lim, st from public.profiles p join public.plan_limits pl on pl.plan=p.plan where p.id=new.author_id;
 if st <> 'active' then raise exception 'ACCOUNT_RESTRICTED'; end if;
 if public.posts_today(new.author_id) >= lim then raise exception 'DAILY_LIMIT_REACHED'; end if;
 return new; end $$;
create trigger posts_limit before insert on public.posts for each row execute function public.enforce_post_limit();

create table public.post_media(
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.posts(id) on delete cascade,
 kind text not null check (kind in ('image','video','audio')),
 url text not null, provider text not null default 'supabase', width int, height int,
 created_at timestamptz not null default now());
create index on public.post_media(post_id);
grant select, insert, delete on public.post_media to authenticated; grant all on public.post_media to service_role;
alter table public.post_media enable row level security;
create policy "media read" on public.post_media for select to authenticated using (true);
create policy "media insert" on public.post_media for insert to authenticated with check (exists(select 1 from public.posts where id=post_id and author_id=auth.uid()));
create policy "media delete" on public.post_media for delete to authenticated using (exists(select 1 from public.posts where id=post_id and author_id=auth.uid()));

create table public.post_likes(post_id uuid references public.posts(id) on delete cascade, user_id uuid references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), primary key(post_id,user_id));
grant select, insert, delete on public.post_likes to authenticated; grant all on public.post_likes to service_role;
alter table public.post_likes enable row level security;
create policy "likes read" on public.post_likes for select to authenticated using (true);
create policy "likes ins" on public.post_likes for insert to authenticated with check (user_id=auth.uid());
create policy "likes del" on public.post_likes for delete to authenticated using (user_id=auth.uid());

create table public.comments(
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.posts(id) on delete cascade,
 author_id uuid not null references public.profiles(id) on delete cascade,
 parent_id uuid references public.comments(id) on delete cascade,
 content text default '' check (char_length(content)<=1000), image_url text,
 created_at timestamptz not null default now());
create index on public.comments(post_id, created_at);
grant select, insert, delete on public.comments to authenticated; grant all on public.comments to service_role;
alter table public.comments enable row level security;
create policy "c read" on public.comments for select to authenticated using (true);
create policy "c ins" on public.comments for insert to authenticated with check (author_id=auth.uid());
create policy "c del" on public.comments for delete to authenticated using (author_id=auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.comment_likes(comment_id uuid references public.comments(id) on delete cascade, user_id uuid references public.profiles(id) on delete cascade, primary key(comment_id,user_id));
grant select, insert, delete on public.comment_likes to authenticated; grant all on public.comment_likes to service_role;
alter table public.comment_likes enable row level security;
create policy "cl read" on public.comment_likes for select to authenticated using (true);
create policy "cl ins" on public.comment_likes for insert to authenticated with check (user_id=auth.uid());
create policy "cl del" on public.comment_likes for delete to authenticated using (user_id=auth.uid());

create table public.polls(id uuid primary key default gen_random_uuid(), post_id uuid not null unique references public.posts(id) on delete cascade, question text not null);
create table public.poll_options(id uuid primary key default gen_random_uuid(), poll_id uuid not null references public.polls(id) on delete cascade, label text not null, position int not null default 0);
create table public.poll_votes(poll_id uuid references public.polls(id) on delete cascade, option_id uuid not null references public.poll_options(id) on delete cascade, user_id uuid references public.profiles(id) on delete cascade, primary key(poll_id,user_id));
grant select, insert on public.polls, public.poll_options, public.poll_votes to authenticated;
grant all on public.polls, public.poll_options, public.poll_votes to service_role;
alter table public.polls enable row level security; alter table public.poll_options enable row level security; alter table public.poll_votes enable row level security;
create policy "p read" on public.polls for select to authenticated using (true);
create policy "p ins" on public.polls for insert to authenticated with check (exists(select 1 from public.posts where id=post_id and author_id=auth.uid()));
create policy "po read" on public.poll_options for select to authenticated using (true);
create policy "po ins" on public.poll_options for insert to authenticated with check (exists(select 1 from public.polls pl join public.posts p on p.id=pl.post_id where pl.id=poll_id and p.author_id=auth.uid()));
create policy "pv read" on public.poll_votes for select to authenticated using (true);
create policy "pv ins" on public.poll_votes for insert to authenticated with check (user_id=auth.uid());

create table public.follows(follower_id uuid references public.profiles(id) on delete cascade, following_id uuid references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), primary key(follower_id,following_id), check(follower_id<>following_id));
create index on public.follows(following_id);
grant select, insert, delete on public.follows to authenticated; grant all on public.follows to service_role;
alter table public.follows enable row level security;
create policy "f read" on public.follows for select to authenticated using (true);
create policy "f ins" on public.follows for insert to authenticated with check (follower_id=auth.uid());
create policy "f del" on public.follows for delete to authenticated using (follower_id=auth.uid());

create table public.friend_requests(id uuid primary key default gen_random_uuid(), sender_id uuid not null references public.profiles(id) on delete cascade, receiver_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), unique(sender_id,receiver_id), check(sender_id<>receiver_id));
grant select, insert, delete on public.friend_requests to authenticated; grant all on public.friend_requests to service_role;
alter table public.friend_requests enable row level security;
create policy "fr read" on public.friend_requests for select to authenticated using (auth.uid() in (sender_id,receiver_id));
create policy "fr ins" on public.friend_requests for insert to authenticated with check (sender_id=auth.uid());
create policy "fr del" on public.friend_requests for delete to authenticated using (auth.uid() in (sender_id,receiver_id));

create table public.friendships(user_a uuid references public.profiles(id) on delete cascade, user_b uuid references public.profiles(id) on delete cascade, created_at timestamptz not null default now(), primary key(user_a,user_b), check(user_a<user_b));
grant select, delete on public.friendships to authenticated; grant all on public.friendships to service_role;
alter table public.friendships enable row level security;
create policy "fs read" on public.friendships for select to authenticated using (true);
create policy "fs del" on public.friendships for delete to authenticated using (auth.uid() in (user_a,user_b));
create or replace function public.accept_friend_request(_req uuid) returns void language plpgsql security definer set search_path=public as $$
declare r record; begin
 select * into r from public.friend_requests where id=_req and receiver_id=auth.uid();
 if not found then raise exception 'not found'; end if;
 insert into public.friendships values(least(r.sender_id,r.receiver_id),greatest(r.sender_id,r.receiver_id)) on conflict do nothing;
 delete from public.friend_requests where id=_req;
 insert into public.notifications(user_id,actor_id,type) values(r.sender_id,auth.uid(),'friend_accept');
end $$;

create or replace function public.is_mutual(_a uuid,_b uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.follows where follower_id=_a and following_id=_b) and exists(select 1 from public.follows where follower_id=_b and following_id=_a) $$;

create table public.conversations(id uuid primary key default gen_random_uuid(), user_a uuid not null references public.profiles(id) on delete cascade, user_b uuid not null references public.profiles(id) on delete cascade, bg_a text, bg_b text, last_message_at timestamptz not null default now(), created_at timestamptz not null default now(), unique(user_a,user_b), check(user_a<user_b));
grant select, insert, update on public.conversations to authenticated; grant all on public.conversations to service_role;
alter table public.conversations enable row level security;
create policy "cv read" on public.conversations for select to authenticated using (auth.uid() in (user_a,user_b));
create policy "cv ins" on public.conversations for insert to authenticated with check (auth.uid() in (user_a,user_b) and public.is_mutual(user_a,user_b));
create policy "cv upd" on public.conversations for update to authenticated using (auth.uid() in (user_a,user_b));

create table public.messages(id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.conversations(id) on delete cascade, sender_id uuid not null references public.profiles(id) on delete cascade, content text not null check (char_length(content) between 1 and 2000), read_at timestamptz, created_at timestamptz not null default now());
create index on public.messages(conversation_id, created_at);
grant select, insert, update on public.messages to authenticated; grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "m read" on public.messages for select to authenticated using (exists(select 1 from public.conversations c where c.id=conversation_id and auth.uid() in (c.user_a,c.user_b)));
create policy "m ins" on public.messages for insert to authenticated with check (sender_id=auth.uid() and exists(select 1 from public.conversations c where c.id=conversation_id and auth.uid() in (c.user_a,c.user_b) and public.is_mutual(c.user_a,c.user_b)));
create policy "m upd" on public.messages for update to authenticated using (sender_id<>auth.uid() and exists(select 1 from public.conversations c where c.id=conversation_id and auth.uid() in (c.user_a,c.user_b)));

create table public.notifications(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, actor_id uuid references public.profiles(id) on delete cascade, type text not null, post_id uuid references public.posts(id) on delete cascade, read boolean not null default false, created_at timestamptz not null default now());
create index on public.notifications(user_id, created_at desc);
grant select, update, delete on public.notifications to authenticated; grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "n read" on public.notifications for select to authenticated using (user_id=auth.uid());
create policy "n upd" on public.notifications for update to authenticated using (user_id=auth.uid());
create policy "n del" on public.notifications for delete to authenticated using (user_id=auth.uid());

create or replace function public.notify_trg() returns trigger language plpgsql security definer set search_path=public as $$
declare owner uuid; begin
 if tg_table_name='post_likes' then select author_id into owner from public.posts where id=new.post_id;
   if owner<>new.user_id then insert into public.notifications(user_id,actor_id,type,post_id) values(owner,new.user_id,'like',new.post_id); end if;
 elsif tg_table_name='comments' then select author_id into owner from public.posts where id=new.post_id;
   if owner<>new.author_id then insert into public.notifications(user_id,actor_id,type,post_id) values(owner,new.author_id,'comment',new.post_id); end if;
 elsif tg_table_name='follows' then insert into public.notifications(user_id,actor_id,type) values(new.following_id,new.follower_id,'follow');
 elsif tg_table_name='friend_requests' then insert into public.notifications(user_id,actor_id,type) values(new.receiver_id,new.sender_id,'friend_request');
 elsif tg_table_name='messages' then
   select case when c.user_a=new.sender_id then c.user_b else c.user_a end into owner from public.conversations c where c.id=new.conversation_id;
   update public.conversations set last_message_at=now() where id=new.conversation_id;
   insert into public.notifications(user_id,actor_id,type) values(owner,new.sender_id,'message');
 end if; return new; end $$;
create trigger n1 after insert on public.post_likes for each row execute function public.notify_trg();
create trigger n2 after insert on public.comments for each row execute function public.notify_trg();
create trigger n3 after insert on public.follows for each row execute function public.notify_trg();
create trigger n4 after insert on public.friend_requests for each row execute function public.notify_trg();
create trigger n5 after insert on public.messages for each row execute function public.notify_trg();

create table public.profile_links(id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, label text not null, url text not null, position int default 0);
grant select, insert, update, delete on public.profile_links to authenticated; grant all on public.profile_links to service_role;
alter table public.profile_links enable row level security;
create policy "pl read" on public.profile_links for select to authenticated using (true);
create policy "pl own" on public.profile_links for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid() and exists(select 1 from public.profiles where id=auth.uid() and plan='premium'));

create table public.reports(id uuid primary key default gen_random_uuid(), reporter_id uuid not null references public.profiles(id) on delete cascade, post_id uuid references public.posts(id) on delete cascade, reported_user_id uuid references public.profiles(id) on delete cascade, reason text not null, status text not null default 'open', created_at timestamptz not null default now());
grant select, insert, update, delete on public.reports to authenticated; grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "r ins" on public.reports for insert to authenticated with check (reporter_id=auth.uid());
create policy "r admin" on public.reports for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "r admin upd" on public.reports for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "r admin del" on public.reports for delete to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.blocked_ips(ip text primary key, reason text, blocked_by uuid references public.profiles(id), created_at timestamptz not null default now());
create table public.login_ips(user_id uuid references public.profiles(id) on delete cascade, ip text not null, last_seen timestamptz not null default now(), primary key(user_id,ip));
grant select, insert, delete on public.blocked_ips to authenticated; grant all on public.blocked_ips to service_role;
grant select on public.login_ips to authenticated; grant all on public.login_ips to service_role;
alter table public.blocked_ips enable row level security; alter table public.login_ips enable row level security;
create policy "bi admin" on public.blocked_ips for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "li admin" on public.login_ips for select to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace view public.profile_stats with (security_invoker=on) as
select p.id,
 (select count(*) from public.follows where following_id=p.id)::int followers,
 (select count(*) from public.follows where follower_id=p.id)::int following,
 (select count(*) from public.friendships where p.id in (user_a,user_b))::int friends,
 (select count(*) from public.posts where author_id=p.id and not removed)::int posts,
 (select count(*) from public.post_likes l join public.posts po on po.id=l.post_id where po.author_id=p.id)::int likes_received
from public.profiles p;
grant select on public.profile_stats to authenticated;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

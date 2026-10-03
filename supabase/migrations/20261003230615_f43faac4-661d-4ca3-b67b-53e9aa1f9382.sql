
revoke execute on function public.handle_new_user(), public.protect_profile_fields(), public.enforce_post_limit(), public.notify_trg() from public, anon, authenticated;
revoke execute on function public.has_role(uuid,app_role), public.is_mutual(uuid,uuid), public.accept_friend_request(uuid), public.posts_today(uuid) from public, anon;
grant execute on function public.has_role(uuid,app_role), public.is_mutual(uuid,uuid), public.accept_friend_request(uuid), public.posts_today(uuid) to authenticated;

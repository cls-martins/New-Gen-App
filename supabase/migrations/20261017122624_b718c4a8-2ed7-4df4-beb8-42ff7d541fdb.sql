revoke execute on function public.is_blacklisted(text,text) from anon, authenticated, public;
grant execute on function public.is_blacklisted(text,text) to service_role;
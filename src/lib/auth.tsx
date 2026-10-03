import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type AuthCtx = {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ user: null, profile: null, isAdmin: false, loading: true, refresh: async () => {} });

export function applyTheme(theme: string | null | undefined) {
  if (typeof document === "undefined") return;
  const t = theme === "light" ? "light" : "dark";
  document.documentElement.classList.toggle("light", t === "light");
  try { localStorage.setItem("ngs-theme", t); } catch {}
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (u: User | null) => {
    setUser(u);
    if (!u) { setProfile(null); setIsAdmin(false); setLoading(false); return; }
    const [{ data: p }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", u.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.id),
    ]);
    setProfile(p ?? null);
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    if (p) applyTheme(p.theme);
    setLoading(false);
  }, []);

  useEffect(() => {
    try { applyTheme(localStorage.getItem("ngs-theme")); } catch {}
    supabase.auth.getUser().then(({ data }) => load(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
        setTimeout(() => load(session?.user ?? null), 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const refresh = useCallback(async () => { await load(user); }, [load, user]);

  return <Ctx.Provider value={{ user, profile, isAdmin, loading, refresh }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

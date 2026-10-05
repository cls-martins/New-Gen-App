import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Home, User, Bell, Settings, MessageSquare, Search, Crown, Shield, LogOut, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Composer } from "./Composer";
import { Avatar, DisplayName } from "./UserBits";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("font-display leading-none", className)}>
      <span className="text-brand">New Gen</span> <span>Shitpost</span>
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin } = useAuth();
  const [composer, setComposer] = useState(false);
  const qc = useQueryClient();
  const nav = useNavigate();

  const { data: unread = 0 } = useQuery({
    queryKey: ["unread", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user!.id).eq("read", false)).count ?? 0,
  });

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel("notif-" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => qc.invalidateQueries({ queryKey: ["unread"] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, qc]);

  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/login", replace: true });
  };

  const items = [
    { to: "/feed", label: "Início", icon: Home },
    { to: "/search", label: "Pesquisar", icon: Search },
    { to: "/notifications", label: "Avisos", icon: Bell, badge: unread },
    { to: "/messages", label: "Mensagens", icon: MessageSquare },
    ...(profile ? [{ to: `/u/${profile.username}`, label: "Meu perfil", icon: User }] : []),
    { to: "/premium", label: "Premium", icon: Crown },
    { to: "/settings", label: "Configurações", icon: Settings },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
  ] as const;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl">
      <aside className="sticky top-0 hidden h-screen w-20 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5 md:flex xl:w-64">
        <Link to="/feed" className="mb-6 px-2"><Logo className="hidden text-2xl xl:inline" /><span className="font-display text-2xl text-brand xl:hidden">NG</span></Link>
        <nav className="flex flex-1 flex-col gap-1">
          {items.map((it) => (
            <a key={it.to} href={it.to} onClick={(e) => { e.preventDefault(); nav({ href: it.to }); }}
              className="group relative flex items-center gap-4 rounded-xl px-3 py-3 text-sidebar-foreground transition hover:bg-sidebar-accent">
              <it.icon size={22} className="transition group-hover:text-primary" />
              <span className="hidden text-[15px] font-medium xl:inline">{it.label}</span>
              {"badge" in it && it.badge > 0 && <span className="absolute left-7 top-2 min-w-5 rounded-full bg-primary px-1.5 text-center text-[11px] font-bold text-primary-foreground">{it.badge}</span>}
            </a>
          ))}
          <Button className="mt-4 h-12 rounded-full shadow-glow" onClick={() => setComposer(true)}>
            <Plus size={20} /><span className="hidden xl:inline">Postar</span>
          </Button>
        </nav>
        {profile && (
          <div className="flex items-center gap-2 rounded-xl p-2">
            <Avatar user={profile} size={36} />
            <div className="hidden min-w-0 flex-1 xl:block"><DisplayName user={profile} className="block truncate text-sm" /><div className="truncate text-xs text-muted-foreground">@{profile.username}</div></div>
            <button onClick={signOut} className="hidden rounded-full p-2 hover:bg-sidebar-accent xl:block" aria-label="Sair"><LogOut size={16} /></button>
          </div>
        )}
      </aside>

      <main className="min-w-0 flex-1 border-r border-border pb-20 md:pb-0">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-border bg-sidebar/95 py-2 backdrop-blur md:hidden">
        {items.filter((i) => ["Início", "Pesquisar", "Avisos", "Mensagens", "Meu perfil"].includes(i.label)).map((it) => (
          <a key={it.to} href={it.to} onClick={(e) => { e.preventDefault(); nav({ href: it.to }); }} className="relative p-2" aria-label={it.label}>
            <it.icon size={24} />
            {"badge" in it && it.badge > 0 && <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-primary" />}
          </a>
        ))}
      </nav>
      <button onClick={() => setComposer(true)} aria-label="Postar" className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow md:hidden"><Plus /></button>
      <Composer open={composer} onOpenChange={setComposer} />
    </div>
  );
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/85 px-4 py-3 backdrop-blur sm:px-5">
      <Link to="/feed" className="md:hidden"><span className="font-display text-xl text-brand">NG</span></Link>
      <h1 className="font-display text-2xl">{title}</h1>
      <div className="ml-auto">{children}</div>
    </header>
  );
}

import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, UserPlus, Users, Mail, Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/social";
import { PageHeader } from "@/components/social/AppShell";
import { Avatar, DisplayName, UserPopover, RelationshipActions } from "@/components/social/UserBits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Avisos — NewGen Shitpost" }, { name: "description", content: "Suas notificações." }, { property: "og:title", content: "Avisos" }, { property: "og:description", content: "Suas notificações." }] }),
  component: Notifications,
});

const TEXT: Record<string, [string, typeof Heart]> = {
  like: ["curtiu sua publicação", Heart],
  comment: ["comentou na sua publicação", MessageCircle],
  follow: ["começou a seguir você", UserPlus],
  friend_request: ["enviou um pedido de amizade", Users],
  friend_accept: ["aceitou sua amizade", Users],
  message: ["enviou uma mensagem", Mail],
  mention: ["mencionou você", Bell],
};

function Notifications() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const prefs = (profile?.notification_prefs ?? {}) as Record<string, boolean>;
  const { data = [], isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("notifications")
      .select("id, type, read, created_at, post_id, actor:profiles!notifications_actor_id_fkey(id, username, display_name, avatar_url, avatar_border_color, name_effect)")
      .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(80)).data ?? [],
  });
  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", user!.id).eq("read", false);
    qc.invalidateQueries({ queryKey: ["notifications"] }); qc.invalidateQueries({ queryKey: ["unread"] });
  };
  useEffect(() => { const t = setTimeout(markAll, 2500); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [user]);

  const list = data.filter((n) => prefs[n.type] !== false);
  return (
    <div>
      <PageHeader title="Avisos"><Button size="sm" variant="ghost" onClick={markAll}>Marcar como lidas</Button></PageHeader>
      {!isLoading && !list.length && <div className="py-20 text-center"><div className="font-display text-4xl text-brand">Nada novo</div><p className="text-muted-foreground">Quando alguém interagir com você, aparece aqui.</p></div>}
      {list.map((n) => {
        const [t, Icon] = TEXT[n.type] ?? ["interagiu com você", Bell];
        return (
          <div key={n.id} className={cn("flex gap-3 border-b border-border px-5 py-4", !n.read && "bg-accent/30")}>
            <Icon size={20} className="mt-1 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              {n.actor && <UserPopover user={n.actor}><Avatar user={n.actor} size={32} /></UserPopover>}
              <p className="mt-1 text-sm">{n.actor && <DisplayName user={n.actor} />} {t} <span className="text-muted-foreground">· {timeAgo(n.created_at)}</span></p>
              {n.type === "friend_request" && n.actor && <div className="mt-2"><RelationshipActions other={n.actor} compact /></div>}
            </div>
            {!n.read && <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
          </div>
        );
      })}
    </div>
  );
}

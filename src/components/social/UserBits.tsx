import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { followUser, unfollowUser, sendFriendRequest, openConversation } from "@/lib/social";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BadgeCheck } from "lucide-react";

export type MiniUser = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  avatar_border_color: string | null;
  name_effect: string | null;
  plan?: string;
  verified?: boolean | null;
};

export function Avatar({ user, size = 40, className }: { user: Pick<MiniUser, "avatar_url" | "display_name" | "avatar_border_color">; size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-wine font-display text-primary-foreground", className)}
      style={{ width: size, height: size, boxShadow: `0 0 0 2px ${user.avatar_border_color || "transparent"}`, fontSize: size * 0.42 }}
    >
      {user.avatar_url ? (
        <img src={user.avatar_url} alt={user.display_name} className="h-full w-full object-cover" loading="lazy" />
      ) : (
        user.display_name?.[0]?.toUpperCase() ?? "?"
      )}
    </span>
  );
}

export function DisplayName({ user, className }: { user: Pick<MiniUser, "display_name" | "name_effect"> & { verified?: boolean | null }; className?: string }) {
  const fx = user.name_effect && user.name_effect !== "none" ? `fx-${user.name_effect}` : "";
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("font-semibold", fx, className)}>{user.display_name}</span>
      {user.verified && <BadgeCheck size={16} className="shrink-0 fill-primary text-primary-foreground" aria-label="Verificado" />}
    </span>
  );
}

export function useProfileStats(id: string | undefined) {
  return useQuery({
    queryKey: ["stats", id],
    enabled: !!id,
    queryFn: async () => {
      const { data } = await supabase.from("profile_stats").select("*").eq("id", id!).maybeSingle();
      return data;
    },
  });
}

export function useRelationship(otherId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["rel", user?.id, otherId],
    enabled: !!user && !!otherId && user.id !== otherId,
    queryFn: async () => {
      const me = user!.id, o = otherId!;
      const [f1, f2, fr, fs] = await Promise.all([
        supabase.from("follows").select("follower_id").eq("follower_id", me).eq("following_id", o).maybeSingle(),
        supabase.from("follows").select("follower_id").eq("follower_id", o).eq("following_id", me).maybeSingle(),
        supabase.from("friend_requests").select("*").or(`and(sender_id.eq.${me},receiver_id.eq.${o}),and(sender_id.eq.${o},receiver_id.eq.${me})`),
        supabase.from("friendships").select("user_a").eq("user_a", me < o ? me : o).eq("user_b", me < o ? o : me).maybeSingle(),
      ]);
      const req = fr.data?.[0];
      return {
        following: !!f1.data,
        followsMe: !!f2.data,
        friends: !!fs.data,
        requestSent: req?.sender_id === me ? req : null,
        requestReceived: req?.receiver_id === me ? req : null,
      };
    },
  });
}

export function RelationshipActions({ other, compact }: { other: MiniUser; compact?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: rel } = useRelationship(other.id);
  const [busy, setBusy] = useState(false);
  if (!user || user.id === other.id || !rel) return null;

  const run = async (fn: () => PromiseLike<unknown>, msg?: string) => {
    setBusy(true);
    try { await fn(); if (msg) toast.success(msg); } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
    qc.invalidateQueries({ queryKey: ["rel"] });
    qc.invalidateQueries({ queryKey: ["stats"] });
  };
  const mutual = rel.following && rel.followsMe;
  const size = compact ? "sm" : "default";

  return (
    <div className="flex flex-wrap gap-2">
      {rel.following ? (
        <Button size={size} variant="secondary" disabled={busy} onClick={() => run(() => unfollowUser(user.id, other.id))}>Seguindo</Button>
      ) : (
        <Button size={size} disabled={busy} onClick={() => run(() => followUser(user.id, other.id), `Seguindo @${other.username}`)}>{rel.followsMe ? "Seguir de volta" : "Seguir"}</Button>
      )}
      {rel.friends ? (
        <Button size={size} variant="outline" disabled={busy} onClick={() => run(async () => {
          if (!confirm("Remover amizade?")) return;
          const a = user.id < other.id ? user.id : other.id; const b = user.id < other.id ? other.id : user.id;
          await supabase.from("friendships").delete().eq("user_a", a).eq("user_b", b);
        }, "Amizade removida")}>Amigos ✓</Button>
      ) : rel.requestReceived ? (
        <>
          <Button size={size} variant="outline" disabled={busy} onClick={() => run(async () => { const { error } = await supabase.rpc("accept_friend_request", { _req: rel.requestReceived!.id }); if (error) throw error; }, "Amizade aceita!")}>Aceitar amizade</Button>
          <Button size={size} variant="ghost" disabled={busy} onClick={() => run(() => supabase.from("friend_requests").delete().eq("id", rel.requestReceived!.id).then(), "Recusada")}>Recusar</Button>
        </>
      ) : rel.requestSent ? (
        <Button size={size} variant="ghost" disabled={busy} onClick={() => run(() => supabase.from("friend_requests").delete().eq("id", rel.requestSent!.id).then(), "Solicitação cancelada")}>Cancelar pedido</Button>
      ) : (
        <Button size={size} variant="outline" disabled={busy} onClick={() => run(() => sendFriendRequest(user.id, other.id), "Pedido de amizade enviado")}>+ Amizade</Button>
      )}
      {mutual && (
        <Button size={size} variant="outline" disabled={busy} onClick={() => run(async () => {
          const id = await openConversation(user.id, other.id);
          nav({ to: "/messages", search: { c: id } });
        })}>Mensagem</Button>
      )}
    </div>
  );
}

/** Wrap any avatar/name with this to open the mini profile. */
export function UserPopover({ user, children }: { user: MiniUser; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className="inline-flex items-center gap-2 text-left hover:opacity-90">{children}</button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 overflow-hidden" align="start">
        {open && <MiniProfile id={user.id} fallback={user} onNavigate={() => setOpen(false)} />}
      </PopoverContent>
    </Popover>
  );
}

function MiniProfile({ id, fallback, onNavigate }: { id: string; fallback: MiniUser; onNavigate: () => void }) {
  const { data: p } = useQuery({
    queryKey: ["profile-id", id],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("id", id).maybeSingle()).data,
  });
  const { data: s } = useProfileStats(id);
  const u = p ?? fallback;
  return (
    <div>
      <div className="h-16 bg-brand" style={p?.banner_url ? { backgroundImage: `url(${p.banner_url})`, backgroundSize: "cover" } : p?.banner_color ? { background: p.banner_color } : undefined} />
      <div className="-mt-8 px-4 pb-4">
        <Avatar user={u} size={64} />
        <div className="mt-2"><DisplayName user={u} className="text-lg" /></div>
        <div className="text-sm text-muted-foreground">@{u.username}</div>
        {p?.bio && <p className="mt-2 line-clamp-2 text-sm">{p.bio}</p>}
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          <span><b className="text-foreground">{s?.friends ?? 0}</b> amigos</span>
          <span><b className="text-foreground">{s?.followers ?? 0}</b> seguidores</span>
          <span><b className="text-foreground">{s?.likes_received ?? 0}</b> curtidas</span>
        </div>
        <div className="mt-3"><RelationshipActions other={u} compact /></div>
        <Button asChild variant="link" className="mt-1 px-0" onClick={onNavigate}>
          <Link to="/u/$username" params={{ username: u.username }}>Ver mais →</Link>
        </Button>
      </div>
    </div>
  );
}

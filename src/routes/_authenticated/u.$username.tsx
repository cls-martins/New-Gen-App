import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, Pin, Play, Music } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PostCard, type Post } from "@/components/social/PostCard";
import { fxClass } from "@/lib/premium-fx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/social/AppShell";
import { Avatar, DisplayName, RelationshipActions, useProfileStats } from "@/components/social/UserBits";
import { Button } from "@/components/ui/button";
import { useFeed } from "./feed";

export const Route = createFileRoute("/_authenticated/u/$username")({
  head: ({ params }) => ({ meta: [{ title: `@${params.username} — NewGen Shitpost` }, { name: "description", content: `Perfil de @${params.username} na NewGen Shitpost.` }, { property: "og:title", content: `@${params.username} — NewGen Shitpost` }, { property: "og:description", content: "Perfil na NewGen Shitpost." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const { data: p, isLoading } = useQuery({
    queryKey: ["profile", username],
    queryFn: async () => (await supabase.from("profiles").select("*").eq("username", username).maybeSingle()).data,
  });
  const { data: s } = useProfileStats(p?.id);
  const { data: links = [] } = useQuery({
    queryKey: ["links", p?.id], enabled: !!p,
    queryFn: async () => (await supabase.from("profile_links").select("*").eq("user_id", p!.id).order("position")).data ?? [],
  });
  const feed = useFeed("all", p?.id ?? "none");

  if (isLoading) return <PageHeader title="Perfil" />;
  if (!p) return <div><PageHeader title="Perfil" /><p className="p-10 text-center text-muted-foreground">Usuário não encontrado.</p></div>;
  const me = user?.id === p.id;

  return (
    <div>
      <PageHeader title={p.display_name} />
      <div className={`h-40 bg-brand sm:h-52 ${p.plan === "premium" && fxClass("bf", p.banner_frame) ? "bf " + fxClass("bf", p.banner_frame) : ""}`} style={p.banner_url ? { backgroundImage: `url(${p.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : p.banner_color ? { background: p.banner_color } : undefined} />
      <div className="px-5 pb-4">
        <div className="-mt-14 flex items-end justify-between">
          <Avatar user={p} size={112} className="ring-4 ring-background" />
          {me ? <Button asChild variant="outline"><Link to="/settings">Editar perfil</Link></Button> : <RelationshipActions other={p} />}
        </div>
        <div className="mt-3">
          <DisplayName user={p} className="text-2xl" />
        </div>
        <div className="text-muted-foreground">@{p.username}</div>
        {p.status !== "active" && <div className="mt-2 text-sm font-semibold text-destructive">Conta {p.status === "banned" ? "banida" : "suspensa"}</div>}
        {p.bio && <p className="mt-3 whitespace-pre-wrap">{p.bio}</p>}
        {links.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-3">
            {links.map((l) => <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 text-sm text-primary hover:underline"><ExternalLink size={14} />{l.label}</a>)}
          </div>
        )}
        <div className="mt-4 grid grid-cols-5 gap-2 text-center">
          {[["Posts", s?.posts], ["Amigos", s?.friends], ["Seguidores", s?.followers], ["Seguindo", s?.following], ["Curtidas", s?.likes_received]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl bg-surface py-2"><div className="font-display text-xl">{v ?? 0}</div><div className="text-[11px] text-muted-foreground">{l}</div></div>
          ))}
        </div>
      </div>
      <div className="border-t border-border"><PostGrid query={feed} /></div>
    </div>
  );
}

function PostGrid({ query }: { query: ReturnType<typeof useFeed> }) {
  const [open, setOpen] = useState<Post | null>(null);
  const posts = query.data?.pages.flat() ?? [];
  if (query.isLoading) return <p className="p-10 text-center text-muted-foreground">Carregando…</p>;
  if (!posts.length) return <p className="p-10 text-center text-muted-foreground">Nenhum post ainda.</p>;
  return (
    <>
      <div className="grid grid-cols-3 gap-0.5">
        {posts.map((post) => {
          const m = post.post_media[0];
          return (
            <button key={post.id} onClick={() => setOpen(post)} className="relative aspect-square overflow-hidden bg-surface text-left" aria-label="Abrir post">
              {m?.kind === "image" ? <img src={m.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                : m?.kind === "video" ? <><video src={m.url} preload="metadata" muted className="h-full w-full object-cover" /><Play className="absolute right-2 top-2" size={16} /></>
                : <div className="flex h-full items-center justify-center p-2 text-center text-xs sm:text-sm">{m?.kind === "audio" && <Music size={14} className="mr-1 shrink-0" />}<span className="line-clamp-5 break-words">{post.content || "Enquete"}</span></div>}
              {post.pinned_at && <Pin className="absolute left-2 top-2 rounded bg-primary p-0.5 text-primary-foreground" size={18} />}
            </button>
          );
        })}
      </div>
      {query.hasNextPage && <div className="p-4 text-center"><Button variant="outline" onClick={() => query.fetchNextPage()} disabled={query.isFetchingNextPage}>Carregar mais</Button></div>}
      <Dialog open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto p-0">
          <DialogTitle className="sr-only">Post</DialogTitle>
          {open && <PostCard post={open} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

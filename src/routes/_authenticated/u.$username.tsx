import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/social/AppShell";
import { Avatar, DisplayName, RelationshipActions, useProfileStats } from "@/components/social/UserBits";
import { Button } from "@/components/ui/button";
import { PostList, useFeed } from "./feed";

export const Route = createFileRoute("/_authenticated/u/$username")({
  head: ({ params }) => ({ meta: [{ title: `@${params.username} — NewGen Shitpost` }, { name: "description", content: `Perfil de @${params.username} na NewGen Shitpost.` }, { property: "og:title", content: `@${params.username}` }, { property: "og:description", content: "Perfil na NewGen Shitpost." }] }),
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
      <div className="h-40 bg-brand sm:h-52" style={p.banner_url ? { backgroundImage: `url(${p.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : p.banner_color ? { background: p.banner_color } : undefined} />
      <div className="px-5 pb-4">
        <div className="-mt-14 flex items-end justify-between">
          <Avatar user={p} size={112} className="ring-4 ring-background" />
          {me ? <Button asChild variant="outline"><Link to="/settings">Editar perfil</Link></Button> : <RelationshipActions other={p} />}
        </div>
        <div className="mt-3">
          <DisplayName user={p} className="text-2xl" />
          {p.plan === "premium" && <span className="ml-2 rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-primary-foreground">PREMIUM</span>}
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
      <div className="border-t border-border"><PostList query={feed} /></div>
    </div>
  );
}

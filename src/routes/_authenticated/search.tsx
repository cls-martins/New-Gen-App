import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { POST_SELECT } from "@/lib/social";
import { PageHeader } from "@/components/social/AppShell";
import { Avatar, DisplayName } from "@/components/social/UserBits";
import { PostCard, type Post } from "@/components/social/PostCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/search")({
  head: () => ({ meta: [{ title: "Pesquisar — NewGen Shitpost" }, { name: "description", content: "Encontre pessoas e posts." }, { property: "og:title", content: "Pesquisar" }, { property: "og:description", content: "Encontre pessoas e posts." }] }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const safe = term.replace(/[%,()]/g, "");
  const { data: users = [] } = useQuery({
    queryKey: ["search-users", safe],
    queryFn: async () => {
      let r = supabase.from("profiles").select("id, username, display_name, avatar_url, avatar_border_color, name_effect, bio").limit(20);
      r = safe ? r.or(`username.ilike.%${safe}%,display_name.ilike.%${safe}%`) : r.order("created_at", { ascending: false });
      return (await r).data ?? [];
    },
  });
  const { data: posts = [] } = useQuery({
    queryKey: ["search-posts", safe], enabled: !!safe,
    queryFn: async () => ((await supabase.from("posts").select(POST_SELECT).eq("removed", false).ilike("content", `%${safe}%`).order("created_at", { ascending: false }).limit(20)).data ?? []) as unknown as Post[],
  });

  return (
    <div>
      <PageHeader title="Pesquisar" />
      <form onSubmit={(e) => { e.preventDefault(); setTerm(q.trim()); }} className="flex gap-2 border-b border-border p-4">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pessoas ou posts…" />
        <Button type="submit" size="icon" aria-label="Buscar"><SearchIcon size={18} /></Button>
      </form>
      <h2 className="px-5 pt-4 text-sm font-semibold uppercase text-muted-foreground">{safe ? "Pessoas" : "Descubra gente nova"}</h2>
      {users.map((u) => (
        <Link key={u.id} to="/u/$username" params={{ username: u.username }} className="flex items-center gap-3 px-5 py-3 transition hover:bg-surface">
          <Avatar user={u} size={44} />
          <div className="min-w-0"><DisplayName user={u} className="block truncate" /><div className="truncate text-sm text-muted-foreground">@{u.username}</div></div>
          <span className="ml-auto text-sm text-primary">Ver perfil</span>
        </Link>
      ))}
      {safe && <h2 className="border-t border-border px-5 pt-4 text-sm font-semibold uppercase text-muted-foreground">Posts</h2>}
      {posts.map((p) => <PostCard key={p.id} post={p} />)}
    </div>
  );
}

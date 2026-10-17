import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { POST_SELECT } from "@/lib/social";
import { PageHeader } from "@/components/social/AppShell";
import { PostCard, type Post } from "@/components/social/PostCard";
import { Composer } from "@/components/social/Composer";
import { Avatar } from "@/components/social/UserBits";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/feed")({
  head: () => ({ meta: [{ title: "Início — NewGen Shitpost" }, { name: "description", content: "Seu feed da comunidade." }, { property: "og:title", content: "Início — NewGen Shitpost" }, { property: "og:description", content: "Seu feed da comunidade." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Feed,
});

const PAGE = 15;

export function useFeed(mode: "all" | "following", authorId?: string) {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: ["feed", mode, authorId ?? null, user?.id],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      let q = supabase.from("posts").select(POST_SELECT).eq("removed", false).order("created_at", { ascending: false }).range(pageParam, pageParam + PAGE - 1);
      if (authorId) q = supabase.from("posts").select(POST_SELECT).eq("removed", false).eq("author_id", authorId).order("pinned_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).range(pageParam, pageParam + PAGE - 1);
      else if (mode === "following" && user) {
        const { data: f } = await supabase.from("follows").select("following_id").eq("follower_id", user.id);
        q = q.in("author_id", [user.id, ...(f ?? []).map((x) => x.following_id)]);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Post[];
    },
    getNextPageParam: (last, all) => (last.length < PAGE ? undefined : all.length * PAGE),
  });
}

export function PostList({ query }: { query: ReturnType<typeof useFeed> }) {
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting && query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage(); }, { rootMargin: "600px" });
    io.observe(el); return () => io.disconnect();
  }, [query]);
  const posts = query.data?.pages.flat() ?? [];
  if (query.isLoading) return <div className="space-y-6 p-5">{[0, 1, 2].map((i) => <div key={i} className="flex gap-3"><Skeleton className="h-11 w-11 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-20 w-full" /></div></div>)}</div>;
  if (!posts.length) return <div className="px-6 py-20 text-center"><div className="font-display text-4xl text-brand">Silêncio total</div><p className="mt-2 text-muted-foreground">Nenhuma publicação por aqui ainda.</p></div>;
  return (
    <>
      {posts.map((p) => <PostCard key={p.id} post={p} />)}
      <div ref={sentinel} className="py-8 text-center text-sm text-muted-foreground">{query.isFetchingNextPage ? "Carregando…" : query.hasNextPage ? "" : "Você chegou ao fim 💀"}</div>
    </>
  );
}

function Feed() {
  const { profile } = useAuth();
  const [mode, setMode] = useState<"all" | "following">("all");
  const [open, setOpen] = useState(false);
  const query = useFeed(mode);
  return (
    <div>
      <PageHeader title="Início" />
      <div className="flex border-b border-border">
        {(["all", "following"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={cn("flex-1 py-3 text-sm font-semibold transition hover:bg-surface", mode === m ? "border-b-2 border-primary text-foreground" : "text-muted-foreground")}>
            {m === "all" ? "Para você" : "Seguindo"}
          </button>
        ))}
      </div>
      <button onClick={() => setOpen(true)} className="flex w-full items-center gap-3 border-b border-border px-5 py-4 text-left text-muted-foreground transition hover:bg-surface">
        {profile && <Avatar user={profile} size={40} />}<span className="text-lg">O que tá rolando?</span>
      </button>
      <PostList query={query} />
      <Composer open={open} onOpenChange={setOpen} />
    </div>
  );
}

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Flag, Trash2, MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/social";
import { toast } from "sonner";
import { Avatar, DisplayName, UserPopover, type MiniUser } from "./UserBits";
import { Comments } from "./Comments";
import { cn } from "@/lib/utils";

export type Post = {
  id: string; content: string | null; created_at: string; author_id: string;
  author: MiniUser | null;
  post_media: { id: string; kind: string; url: string }[];
  polls: { id: string; question: string; poll_options: { id: string; label: string; position: number }[]; poll_votes: { option_id: string; user_id: string }[] }[] | { id: string; question: string; poll_options: { id: string; label: string; position: number }[]; poll_votes: { option_id: string; user_id: string }[] } | null;
  post_likes: { user_id: string }[];
  comments: { count: number }[];
};

export function PostCard({ post }: { post: Post }) {
  const { user, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [liked, setLiked] = useState(post.post_likes.some((l) => l.user_id === user?.id));
  const [likes, setLikes] = useState(post.post_likes.length);
  const [pop, setPop] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const poll = Array.isArray(post.polls) ? post.polls[0] : post.polls;
  const [votes, setVotes] = useState(poll?.poll_votes ?? []);
  const a = post.author;
  if (!a) return null;

  const toggleLike = async () => {
    if (!user) return;
    const next = !liked;
    setLiked(next); setLikes((n) => n + (next ? 1 : -1));
    if (next) { setPop(true); setTimeout(() => setPop(false), 400); }
    const { error } = next
      ? await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id })
      : await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    if (error) { setLiked(!next); setLikes((n) => n + (next ? -1 : 1)); }
  };

  const vote = async (optionId: string) => {
    if (!user || !poll || votes.some((v) => v.user_id === user.id)) return;
    setVotes([...votes, { option_id: optionId, user_id: user.id }]);
    const { error } = await supabase.from("poll_votes").insert({ poll_id: poll.id, option_id: optionId, user_id: user.id });
    if (error) toast.error("Você já votou");
  };

  const remove = async () => {
    if (!confirm("Excluir esta publicação?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) return toast.error("Não foi possível excluir");
    toast.success("Publicação excluída");
    qc.invalidateQueries({ queryKey: ["feed"] });
    qc.invalidateQueries({ queryKey: ["admin"] });
  };

  const report = async () => {
    const reason = prompt("Por que você está denunciando esta publicação?");
    if (!reason || !user) return;
    const { error } = await supabase.from("reports").insert({ reporter_id: user.id, post_id: post.id, reported_user_id: post.author_id, reason });
    if (error) toast.error("Erro ao denunciar"); else toast.success("Denúncia enviada. Obrigado!");
  };

  const myVote = votes.find((v) => v.user_id === user?.id);
  const total = votes.length;

  return (
    <article className="border-b border-border px-4 py-4 transition-colors hover:bg-surface/60 sm:px-5">
      <div className="flex gap-3">
        <UserPopover user={a}><Avatar user={a} size={44} /></UserPopover>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <UserPopover user={a}>
              <DisplayName user={a} className="truncate" />
              <span className="truncate text-sm text-muted-foreground">@{a.username}</span>
            </UserPopover>
            <span className="text-sm text-muted-foreground">· {timeAgo(post.created_at)}</span>
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-auto rounded-full p-1 text-muted-foreground hover:bg-muted" aria-label="Opções"><MoreHorizontal size={18} /></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user?.id !== post.author_id && <DropdownMenuItem onClick={report}><Flag size={14} className="mr-2" />Denunciar</DropdownMenuItem>}
                {(user?.id === post.author_id || isAdmin) && <DropdownMenuItem onClick={remove} className="text-destructive"><Trash2 size={14} className="mr-2" />Excluir</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {post.content && <p className="mt-1 whitespace-pre-wrap break-words">{post.content}</p>}

          {post.post_media.map((m) => (
            <div key={m.id} className="mt-3 overflow-hidden rounded-xl border border-border">
              {m.kind === "image" && <img src={m.url} alt="" loading="lazy" className="max-h-[560px] w-full bg-muted object-contain" />}
              {m.kind === "video" && <video src={m.url} controls preload="metadata" className="max-h-[560px] w-full bg-muted" />}
              {m.kind === "audio" && <div className="bg-brand p-3"><audio src={m.url} controls preload="none" className="w-full" /></div>}
            </div>
          ))}

          {poll && (
            <div className="mt-3 space-y-2 rounded-xl border border-border p-3">
              <div className="font-semibold">{poll.question}</div>
              {[...poll.poll_options].sort((x, y) => x.position - y.position).map((o) => {
                const n = votes.filter((v) => v.option_id === o.id).length;
                const pct = total ? Math.round((n / total) * 100) : 0;
                return (
                  <button key={o.id} disabled={!!myVote} onClick={() => vote(o.id)}
                    className={cn("relative w-full overflow-hidden rounded-lg border border-border px-3 py-2 text-left text-sm transition", !myVote && "hover:border-primary")}>
                    {myVote && <span className="absolute inset-y-0 left-0 bg-accent transition-all" style={{ width: `${pct}%` }} />}
                    <span className="relative flex justify-between"><span>{o.label}{myVote?.option_id === o.id && " ✓"}</span>{myVote && <span>{pct}%</span>}</span>
                  </button>
                );
              })}
              <div className="text-xs text-muted-foreground">{total} voto{total === 1 ? "" : "s"}</div>
            </div>
          )}

          <div className="mt-3 flex gap-6 text-sm text-muted-foreground">
            <button onClick={toggleLike} className={cn("flex items-center gap-1.5 transition hover:text-primary", liked && "text-primary")} aria-label="Curtir">
              <Heart size={18} className={cn(pop && "animate-pop")} fill={liked ? "currentColor" : "none"} /> {likes}
            </button>
            <button onClick={() => setShowComments((s) => !s)} className="flex items-center gap-1.5 transition hover:text-primary" aria-label="Comentários">
              <MessageCircle size={18} /> {post.comments?.[0]?.count ?? 0}
            </button>
          </div>
          {showComments && <Comments postId={post.id} />}
        </div>
      </div>
    </article>
  );
}

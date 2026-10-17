import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, ImagePlus, Trash2, X, CornerDownRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { uploadImage } from "@/lib/media";
import { timeAgo } from "@/lib/social";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Avatar, DisplayName, UserPopover } from "./UserBits";
import { ImageCropper } from "./ImageCropper";
import { cn } from "@/lib/utils";
import { fxClass } from "@/lib/premium-fx";

export function Comments({ postId }: { postId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["comments", postId];
  const { data: comments = [] } = useQuery({
    queryKey: key,
    queryFn: async () => (await supabase.from("comments")
      .select("id, content, image_url, created_at, author_id, parent_id, author:profiles!comments_author_id_fkey(id, username, display_name, avatar_url, avatar_border_color, name_effect, plan, verified, avatar_frame, comment_style), comment_likes(user_id)")
      .eq("post_id", postId).order("created_at")).data ?? [],
  });
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: string; username: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [img, setImg] = useState<{ blob: Blob; url: string } | null>(null);
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const send = async () => {
    if (!user || (!text.trim() && !img)) return;
    setSending(true);
    try {
      const image_url = img ? await uploadImage(user.id, img.blob, 1200) : null;
      const { error } = await supabase.from("comments").insert({ post_id: postId, author_id: user.id, content: text.trim(), image_url, parent_id: replyTo?.id ?? null });
      if (error) throw error;
      setText(""); setImg(null); setReplyTo(null);
      qc.invalidateQueries({ queryKey: key });
    } catch (e) { toast.error((e as Error).message); }
    setSending(false);
  };

  const like = async (id: string, liked: boolean) => {
    if (!user) return;
    if (liked) await supabase.from("comment_likes").delete().eq("comment_id", id).eq("user_id", user.id);
    else await supabase.from("comment_likes").insert({ comment_id: id, user_id: user.id });
    qc.invalidateQueries({ queryKey: key });
  };
  const del = async (id: string) => {
    if (!confirm("Excluir comentário?")) return;
    await supabase.from("comments").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: key });
  };

  const roots = comments.filter((c) => !c.parent_id);
  const render = (c: (typeof comments)[number], nested = false) => {
    const liked = c.comment_likes.some((l) => l.user_id === user?.id);
    if (!c.author) return null;
    return (
      <div key={c.id} className={cn("flex gap-2", nested && "ml-9")}>
        <UserPopover user={c.author}><Avatar user={c.author} size={30} /></UserPopover>
        <div className="min-w-0 flex-1">
          <div className={cn("rounded-xl bg-muted px-3 py-2", c.author.plan === "premium" && fxClass("cs", c.author.comment_style))}>
            <UserPopover user={c.author}><DisplayName user={c.author} className="text-sm" /><span className="text-xs text-muted-foreground">@{c.author.username}</span></UserPopover>
            {c.content && <p className="whitespace-pre-wrap break-words text-sm">{c.content}</p>}
            {c.image_url && <img src={c.image_url} alt="" loading="lazy" className="mt-2 max-h-72 rounded-lg" />}
          </div>
          <div className="mt-1 flex gap-4 px-2 text-xs text-muted-foreground">
            <span>{timeAgo(c.created_at)}</span>
            <button onClick={() => like(c.id, liked)} className={cn("flex items-center gap-1 hover:text-primary", liked && "text-primary")}><Heart size={12} fill={liked ? "currentColor" : "none"} />{c.comment_likes.length}</button>
            {!nested && <button onClick={() => setReplyTo({ id: c.id, username: c.author!.username })} className="hover:text-primary">Responder</button>}
            {c.author_id === user?.id && <button onClick={() => del(c.id)} className="hover:text-destructive"><Trash2 size={12} /></button>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-3 space-y-3">
      {roots.map((c) => (
        <div key={c.id} className="space-y-2">
          {render(c)}
          {comments.filter((r) => r.parent_id === c.id).map((r) => render(r, true))}
        </div>
      ))}
      <div className="rounded-xl border border-border p-2">
        {replyTo && <div className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><CornerDownRight size={12} />Respondendo @{replyTo.username}<button onClick={() => setReplyTo(null)}><X size={12} /></button></div>}
        {img && (
          <div className="relative mb-2 inline-block">
            <img src={img.url} alt="Prévia" className="max-h-32 rounded-lg" />
            <button onClick={() => setImg(null)} className="absolute right-1 top-1 rounded-full bg-background/80 p-0.5"><X size={14} /></button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Escreva um comentário…" rows={1} maxLength={1000}
            className="min-h-9 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm outline-none" />
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ""; }} />
          <Button size="icon" variant="ghost" onClick={() => inputRef.current?.click()} aria-label="Adicionar imagem"><ImagePlus size={18} /></Button>
          <Button size="sm" onClick={send} disabled={sending || (!text.trim() && !img)}>{sending ? "…" : "Enviar"}</Button>
        </div>
      </div>
      <ImageCropper file={file} open={!!file} onCancel={() => setFile(null)} onDone={(blob, url) => { setImg({ blob, url }); setFile(null); }} />
    </div>
  );
}

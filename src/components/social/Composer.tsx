import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ImagePlus, Video, Music, BarChart3, X, Link2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { uploadImage, uploadMedia, validateFile } from "@/lib/media";
import { toast } from "sonner";
import { ImageCropper } from "./ImageCropper";
import { Avatar } from "./UserBits";

type MediaDraft = { kind: "video" | "audio"; file?: File; url?: string };

export function useDailyQuota() {
  const { user, profile } = useAuth();
  return useQuery({
    queryKey: ["quota", user?.id, profile?.plan],
    enabled: !!user && !!profile,
    queryFn: async () => {
      const [{ data: used }, { data: lim }] = await Promise.all([
        supabase.rpc("posts_today", { _uid: user!.id }),
        supabase.from("plan_limits").select("daily_posts").eq("plan", profile!.plan).maybeSingle(),
      ]);
      return { used: used ?? 0, limit: lim?.daily_posts ?? 6 };
    },
  });
}

export function Composer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const { data: quota } = useDailyQuota();
  const [text, setText] = useState("");
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [image, setImage] = useState<{ blob: Blob; url: string } | null>(null);
  const [media, setMedia] = useState<MediaDraft | null>(null);
  const [linkMode, setLinkMode] = useState<"video" | "audio" | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [poll, setPoll] = useState<{ q: string; opts: string[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const vidRef = useRef<HTMLInputElement>(null);
  const audRef = useRef<HTMLInputElement>(null);

  const reached = quota && quota.used >= quota.limit;
  const reset = () => { setText(""); setImage(null); setMedia(null); setPoll(null); setLinkMode(null); setLinkUrl(""); };

  const pickFile = (kind: "video" | "audio") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f) return;
    const err = validateFile(f, kind);
    if (err) return toast.error(err);
    setMedia({ kind, file: f });
  };

  const canPost = !!(text.trim() || image || media || (poll && poll.q.trim() && poll.opts.filter((o) => o.trim()).length >= 2));

  const submit = async () => {
    if (!user || !canPost) return;
    setBusy(true);
    try {
      const { data: post, error } = await supabase.from("posts").insert({ author_id: user.id, content: text.trim() }).select("id").single();
      if (error) throw new Error(error.message.includes("DAILY_LIMIT") ? "Você atingiu o limite diário de posts." : error.message.includes("RESTRICTED") ? "Sua conta está restrita." : error.message);
      if (image) {
        const url = await uploadImage(user.id, image.blob);
        await supabase.from("post_media").insert({ post_id: post.id, kind: "image", url });
      }
      if (media) {
        const url = media.url ?? (await uploadMedia(user.id, media.file!, media.file!.name.split(".").pop() || "bin"));
        await supabase.from("post_media").insert({ post_id: post.id, kind: media.kind, url, provider: media.url ? "external" : "supabase" });
      }
      if (poll) {
        const { data: p } = await supabase.from("polls").insert({ post_id: post.id, question: poll.q.trim() }).select("id").single();
        if (p) await supabase.from("poll_options").insert(poll.opts.filter((o) => o.trim()).map((label, position) => ({ poll_id: p.id, label: label.trim(), position })));
      }
      toast.success("Publicado!");
      reset(); onOpenChange(false);
      qc.invalidateQueries({ queryKey: ["feed"] });
      qc.invalidateQueries({ queryKey: ["quota"] });
    } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle className="font-display text-2xl">Nova publicação</DialogTitle></DialogHeader>
          {reached ? (
            <div className="space-y-3 py-4 text-center">
              <div className="font-display text-3xl text-brand">Limite atingido</div>
              <p className="text-muted-foreground">Você já fez {quota!.used} de {quota!.limit} posts hoje. O limite volta à meia-noite.</p>
              {profile?.plan !== "premium" && <Button asChild variant="default" onClick={() => onOpenChange(false)}><Link to="/premium">Quero o Premium</Link></Button>}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3">
                {profile && <Avatar user={profile} size={40} />}
                <textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={4} placeholder="O que tá rolando na New Gen?"
                  className="flex-1 resize-none bg-transparent text-lg outline-none placeholder:text-muted-foreground" />
              </div>
              {image && <Preview onRemove={() => setImage(null)}><img src={image.url} alt="" className="max-h-72 w-full object-contain" /></Preview>}
              {media && <Preview onRemove={() => setMedia(null)}><div className="p-3 text-sm">{media.kind === "video" ? "🎬" : "🎵"} {media.file?.name ?? media.url}</div></Preview>}
              {linkMode && (
                <div className="flex gap-2">
                  <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder={`Link direto do ${linkMode === "video" ? "vídeo (.mp4)" : "áudio (.mp3)"}`} />
                  <Button onClick={() => { if (!/^https:\/\//.test(linkUrl)) return toast.error("Use um link https"); setMedia({ kind: linkMode, url: linkUrl }); setLinkMode(null); setLinkUrl(""); }}>OK</Button>
                </div>
              )}
              {poll && (
                <div className="space-y-2 rounded-xl border border-border p-3">
                  <div className="flex gap-2"><Input placeholder="Pergunta da enquete" value={poll.q} onChange={(e) => setPoll({ ...poll, q: e.target.value })} /><Button size="icon" variant="ghost" onClick={() => setPoll(null)}><X size={16} /></Button></div>
                  {poll.opts.map((o, i) => (
                    <Input key={i} placeholder={`Opção ${i + 1}`} value={o} onChange={(e) => setPoll({ ...poll, opts: poll.opts.map((x, j) => (j === i ? e.target.value : x)) })} />
                  ))}
                  {poll.opts.length < 6 && <Button size="sm" variant="ghost" onClick={() => setPoll({ ...poll, opts: [...poll.opts, ""] })}>+ opção</Button>}
                </div>
              )}
              <div className="flex items-center gap-1 border-t border-border pt-3">
                <input ref={imgRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) setCropFile(f); }} />
                <input ref={vidRef} type="file" accept="video/*" hidden onChange={pickFile("video")} />
                <input ref={audRef} type="file" accept="audio/*" hidden onChange={pickFile("audio")} />
                <Tool label="Imagem" onClick={() => imgRef.current?.click()}><ImagePlus size={20} /></Tool>
                <Tool label="Vídeo" disabled={!!media} onClick={() => vidRef.current?.click()}><Video size={20} /></Tool>
                <Tool label="Áudio" disabled={!!media} onClick={() => audRef.current?.click()}><Music size={20} /></Tool>
                <Tool label="Link de vídeo/áudio" disabled={!!media} onClick={() => setLinkMode(linkMode ? null : "audio")}><Link2 size={20} /></Tool>
                {linkMode && (
                  <select value={linkMode} onChange={(e) => setLinkMode(e.target.value as "video" | "audio")} className="rounded bg-muted px-1 text-xs">
                    <option value="audio">áudio</option><option value="video">vídeo</option>
                  </select>
                )}
                <Tool label="Enquete" disabled={!!poll} onClick={() => setPoll({ q: "", opts: ["", ""] })}><BarChart3 size={20} /></Tool>
                <span className="ml-auto mr-2 text-xs text-muted-foreground">{quota ? `${quota.used}/${quota.limit} hoje` : ""}</span>
                <Button onClick={submit} disabled={!canPost || busy}>{busy ? "Publicando…" : "Publicar"}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ImageCropper file={cropFile} open={!!cropFile} onCancel={() => setCropFile(null)} onDone={(blob, url) => { setImage({ blob, url }); setCropFile(null); }} />
    </>
  );
}

function Tool({ children, label, onClick, disabled }: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className="rounded-full p-2 text-primary transition hover:bg-accent disabled:opacity-30">{children}</button>;
}
function Preview({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
      {children}
      <button onClick={onRemove} className="absolute right-2 top-2 rounded-full bg-background/80 p-1"><X size={14} /></button>
    </div>
  );
}

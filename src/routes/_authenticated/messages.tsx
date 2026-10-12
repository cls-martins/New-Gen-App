import { useEffect, useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Palette, Send, CheckCheck, Check } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { timeAgo } from "@/lib/social";
import { PageHeader } from "@/components/social/AppShell";
import { Avatar, DisplayName, UserPopover } from "@/components/social/UserBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/messages")({
  validateSearch: z.object({ c: z.string().optional() }),
  head: () => ({ meta: [{ title: "Mensagens — NewGen Shitpost" }, { name: "description", content: "Suas conversas privadas." }, { property: "og:title", content: "Mensagens" }, { property: "og:description", content: "Suas conversas privadas." }] }),
  component: Messages,
});

const PROFILE_COLS = "id, username, display_name, avatar_url, avatar_border_color, name_effect";
const BGS = ["", "#1a0507", "#2b0a10", "#0d0d0d", "#14213d", "#1b2e1b", "#f4ece4"];

function Messages() {
  const { c } = Route.useSearch();
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: convs = [] } = useQuery({
    queryKey: ["convs", user?.id],
    enabled: !!user,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data } = await supabase.from("conversations")
        .select(`id, user_a, user_b, bg_a, bg_b, last_message_at, a:profiles!conversations_user_a_fkey(${PROFILE_COLS}), b:profiles!conversations_user_b_fkey(${PROFILE_COLS}), messages(id, sender_id, read_at)`)
        .order("last_message_at", { ascending: false });
      return (data ?? []).map((cv) => ({
        ...cv,
        other: cv.user_a === user!.id ? cv.b : cv.a,
        unread: cv.messages.filter((m) => m.sender_id !== user!.id && !m.read_at).length,
      }));
    },
  });
  const active = convs.find((x) => x.id === c);

  return (
    <div className="flex h-[calc(100vh-4rem)] md:h-screen">
      <div className={cn("w-full border-r border-border md:w-80", active && "hidden md:block")}>
        <PageHeader title="Mensagens" />
        {!convs.length && <p className="p-6 text-sm text-muted-foreground">Nenhuma conversa ainda. Vocês precisam se seguir mutuamente — abra o perfil de alguém e toque em "Mensagem".</p>}
        {convs.map((cv) => cv.other && (
          <button key={cv.id} onClick={() => nav({ to: "/messages", search: { c: cv.id } })}
            className={cn("flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface", cv.id === c && "bg-accent/40")}>
            <Avatar user={cv.other} size={44} />
            <div className="min-w-0 flex-1"><DisplayName user={cv.other} className="block truncate" /><div className="text-xs text-muted-foreground">{timeAgo(cv.last_message_at)}</div></div>
            {cv.unread > 0 && <span className="rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">{cv.unread}</span>}
          </button>
        ))}
      </div>
      <div className={cn("flex-1", !active && "hidden md:flex md:items-center md:justify-center")}>
        {active?.other ? <Chat conv={active} other={active.other} /> : <div className="text-center"><div className="font-display text-4xl text-brand">Bora conversar</div><p className="text-muted-foreground">Escolha uma conversa.</p></div>}
      </div>
    </div>
  );
}

type Conv = { id: string; user_a: string; bg_a: string | null; bg_b: string | null };
type Other = { id: string; username: string; display_name: string; avatar_url: string | null; avatar_border_color: string | null; name_effect: string | null };

function Chat({ conv, other }: { conv: Conv; other: Other }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const key = ["msgs", conv.id];
  const isA = conv.user_a === user?.id;
  const bg = (isA ? conv.bg_a : conv.bg_b) || "";

  const { data: msgs = [] } = useQuery({
    queryKey: key,
    queryFn: async () => (await supabase.from("messages").select("*").eq("conversation_id", conv.id).order("created_at").limit(300)).data ?? [],
  });
  const { data: mutual = true } = useQuery({
    queryKey: ["mutual", user?.id, other.id],
    queryFn: async () => (await supabase.rpc("is_mutual", { _a: user!.id, _b: other.id })).data ?? false,
  });

  useEffect(() => {
    const ch = supabase.channel("chat-" + conv.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${conv.id}` }, () => qc.invalidateQueries({ queryKey: key }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv.id]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
    const unread = msgs.filter((m) => m.sender_id !== user?.id && !m.read_at);
    if (unread.length) supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", unread.map((m) => m.id)).then(() => qc.invalidateQueries({ queryKey: ["convs"] }));
  }, [msgs, user, qc]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim(); if (!t || !user) return;
    setText("");
    await supabase.from("messages").insert({ conversation_id: conv.id, sender_id: user.id, content: t });
    qc.invalidateQueries({ queryKey: key });
  };
  const setBg = async (v: string) => {
    await supabase.from("conversations").update(isA ? { bg_a: v || null } : { bg_b: v || null }).eq("id", conv.id);
    qc.invalidateQueries({ queryKey: ["convs"] });
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button className="md:hidden" onClick={() => nav({ to: "/messages", search: {} })} aria-label="Voltar"><ArrowLeft /></button>
        <UserPopover user={other}><Avatar user={other} size={36} /><DisplayName user={other} /></UserPopover>
        <Popover>
          <PopoverTrigger asChild><Button size="icon" variant="ghost" className="ml-auto" aria-label="Fundo da conversa"><Palette size={18} /></Button></PopoverTrigger>
          <PopoverContent className="w-60">
            <div className="mb-2 text-sm font-semibold">Fundo da conversa</div>
            <div className="flex flex-wrap gap-2">
              {BGS.map((b) => <button key={b || "default"} onClick={() => setBg(b)} className="h-8 w-8 rounded-full border border-border" style={{ background: b || "var(--background)" }} title={b || "Padrão"} />)}
              <input type="color" onChange={(e) => setBg(e.target.value)} className="h-8 w-8 cursor-pointer rounded-full" aria-label="Cor personalizada" />
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-4" style={bg ? { background: bg } : undefined}>
        {msgs.map((m) => {
          const mine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[75%] rounded-2xl px-3 py-2 text-sm", mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-secondary text-secondary-foreground")}>
                <p className="whitespace-pre-wrap break-words">{m.content}</p>
                <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] opacity-70">
                  {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  {mine && (m.read_at ? <CheckCheck size={12} /> : <Check size={12} />)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      {mutual ? (
        <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Mensagem…" maxLength={2000} />
          <Button type="submit" size="icon" aria-label="Enviar"><Send size={18} /></Button>
        </form>
      ) : (
        <div className="border-t border-border p-4 text-center text-sm text-muted-foreground">Vocês não se seguem mais mutuamente. A conversa está pausada.</div>
      )}
    </div>
  );
}

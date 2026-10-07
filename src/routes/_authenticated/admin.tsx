import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { POST_SELECT, timeAgo } from "@/lib/social";
import { PageHeader } from "@/components/social/AppShell";
import { PostCard, type Post } from "@/components/social/PostCard";
import { Avatar, DisplayName } from "@/components/social/UserBits";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: (context as { user: { id: string } }).user.id, _role: "admin" });
    if (!data) throw redirect({ to: "/feed" });
  },
  head: () => ({ meta: [{ title: "Admin — New Gen Shitpost" }, { name: "description", content: "Moderação." }, { property: "og:title", content: "Admin" }, { property: "og:description", content: "Moderação." }] }),
  component: Admin,
});

function Admin() {
  return (
    <div>
      <PageHeader title="Admin" />
      <Tabs defaultValue="reports" className="p-4">
        <TabsList><TabsTrigger value="reports">Denúncias</TabsTrigger><TabsTrigger value="users">Perfis</TabsTrigger><TabsTrigger value="ips">IPs bloqueados</TabsTrigger></TabsList>
        <TabsContent value="reports"><Reports /></TabsContent>
        <TabsContent value="users"><Users /></TabsContent>
        <TabsContent value="ips"><Ips /></TabsContent>
      </Tabs>
    </div>
  );
}

function Reports() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["admin", "reports"],
    queryFn: async () => {
      const { data: reps } = await supabase.from("reports").select("id, reason, status, created_at, post_id, reporter:profiles!reports_reporter_id_fkey(username)").eq("status", "open").order("created_at", { ascending: false });
      const ids = [...new Set((reps ?? []).map((r) => r.post_id).filter(Boolean))] as string[];
      const { data: posts } = ids.length ? await supabase.from("posts").select(POST_SELECT).in("id", ids) : { data: [] };
      const byPost = new Map<string, { post: Post | undefined; reports: typeof reps }>();
      (reps ?? []).forEach((r) => {
        if (!r.post_id) return;
        const e = byPost.get(r.post_id) ?? { post: (posts as unknown as Post[] | null)?.find((p) => p.id === r.post_id), reports: [] };
        e.reports!.push(r); byPost.set(r.post_id, e);
      });
      return [...byPost.entries()].sort((a, b) => b[1].reports!.length - a[1].reports!.length);
    },
  });
  const dismiss = async (postId: string) => {
    await supabase.from("reports").update({ status: "dismissed" }).eq("post_id", postId);
    qc.invalidateQueries({ queryKey: ["admin"] });
  };
  if (!data.length) return <p className="py-10 text-center text-muted-foreground">Nenhuma denúncia aberta 🎉</p>;
  return (
    <div className="space-y-4 pt-3">
      {data.map(([pid, { post, reports }]) => (
        <div key={pid} className="overflow-hidden rounded-xl border border-destructive/50">
          <div className="bg-destructive/10 px-4 py-2 text-sm">
            <b>{reports!.length} denúncia(s)</b>
            {reports!.map((r) => <div key={r.id} className="text-muted-foreground">@{r.reporter?.username}: “{r.reason}” · {timeAgo(r.created_at)}</div>)}
          </div>
          {post ? <PostCard post={post} /> : <p className="p-4 text-sm text-muted-foreground">Post já removido.</p>}
          <div className="flex gap-2 p-3"><Button size="sm" variant="secondary" onClick={() => dismiss(pid)}>Ignorar denúncias</Button></div>
        </div>
      ))}
    </div>
  );
}

function Users() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const { data = [] } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("display_name")).data ?? [],
  });
  const { data: ips = [] } = useQuery({
    queryKey: ["admin", "ips", open], enabled: !!open,
    queryFn: async () => (await supabase.from("login_ips").select("*").eq("user_id", open!).order("last_seen", { ascending: false })).data ?? [],
  });
  const set = async (id: string, patch: { plan?: "free" | "premium"; status?: string }) => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", id);
    if (error) toast.error("Erro"); else { toast.success("Atualizado"); qc.invalidateQueries({ queryKey: ["admin"] }); }
  };
  const block = async (ip: string) => {
    const reason = prompt("Motivo do bloqueio?") ?? "";
    const { error } = await supabase.from("blocked_ips").insert({ ip, reason, blocked_by: user!.id });
    if (error) toast.error("Já bloqueado ou erro"); else { toast.success(`IP ${ip} bloqueado`); qc.invalidateQueries({ queryKey: ["admin"] }); }
  };
  const list = data.filter((p) => !filter || (p.display_name + p.username).toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="pt-3">
      <Input placeholder="Filtrar…" value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-3" />
      {list.map((p) => (
        <div key={p.id} className="border-b border-border py-3">
          <div className="flex items-center gap-3">
            <Avatar user={p} size={40} />
            <div className="min-w-0 flex-1">
              <Link to="/u/$username" params={{ username: p.username }}><DisplayName user={p} /></Link>
              <div className="text-xs text-muted-foreground">@{p.username} · 📱 {p.phone || "sem telefone"} · {p.plan} · <span className={p.status !== "active" ? "text-destructive" : ""}>{p.status}</span></div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setOpen(open === p.id ? null : p.id)}>Gerenciar</Button>
          </div>
          {open === p.id && (
            <div className="mt-3 space-y-3 rounded-xl bg-surface p-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={p.plan === "premium" ? "secondary" : "default"} onClick={() => set(p.id, { plan: p.plan === "premium" ? "free" : "premium" })}>{p.plan === "premium" ? "Remover Premium" : "Ativar Premium"}</Button>
                <Button size="sm" variant="outline" onClick={() => set(p.id, { status: "active" })}>Ativar</Button>
                <Button size="sm" variant="outline" onClick={() => set(p.id, { status: "suspended" })}>Suspender</Button>
                <Button size="sm" variant="destructive" onClick={() => confirm("Banir usuário?") && set(p.id, { status: "banned" })}>Banir</Button>
              </div>
              <div className="text-sm font-semibold">IPs usados</div>
              {!ips.length && <div className="text-xs text-muted-foreground">Nenhum registro</div>}
              {ips.map((i) => <div key={i.ip} className="flex items-center gap-2 text-sm"><code>{i.ip}</code><span className="text-xs text-muted-foreground">{timeAgo(i.last_seen)}</span><Button size="sm" variant="destructive" className="ml-auto" onClick={() => block(i.ip)}>Bloquear IP</Button></div>)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function Ips() {
  const qc = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ["admin", "blocked"], queryFn: async () => (await supabase.from("blocked_ips").select("*").order("created_at", { ascending: false })).data ?? [] });
  if (!data.length) return <p className="py-10 text-center text-muted-foreground">Nenhum IP bloqueado.</p>;
  return (
    <div className="pt-3">
      {data.map((b) => (
        <div key={b.ip} className="flex items-center gap-3 border-b border-border py-3 text-sm">
          <code>{b.ip}</code><span className="text-muted-foreground">{b.reason}</span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={async () => { await supabase.from("blocked_ips").delete().eq("ip", b.ip); qc.invalidateQueries({ queryKey: ["admin"] }); }}>Desbloquear</Button>
        </div>
      ))}
    </div>
  );
}

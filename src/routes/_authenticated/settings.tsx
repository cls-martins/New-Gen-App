import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { applyTheme, useAuth } from "@/lib/auth";
import { uploadImage } from "@/lib/media";
import { deleteMyAccount } from "@/lib/security.functions";
import { PageHeader } from "@/components/social/AppShell";
import { Avatar, DisplayName } from "@/components/social/UserBits";
import { ImageCropper } from "@/components/social/ImageCropper";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configurações — New Gen Shitpost" }, { name: "description", content: "Conta, perfil, aparência e privacidade." }, { property: "og:title", content: "Configurações" }, { property: "og:description", content: "Ajuste sua conta." }] }),
  component: Settings,
});

const EFFECTS = ["none", "gradient", "glow", "fire", "chrome"];
const EFFECT_LABEL: Record<string, string> = { none: "Nenhum", gradient: "Gradiente", glow: "Brilho", fire: "Fogo", chrome: "Cromado" };
const NOTIF = [["like", "Curtidas"], ["comment", "Comentários"], ["follow", "Novos seguidores"], ["friend_request", "Pedidos de amizade"], ["friend_accept", "Amizades aceitas"], ["message", "Mensagens"]];

function Settings() {
  const { user, profile, refresh } = useAuth();
  const qc = useQueryClient();
  const nav = useNavigate();
  const [f, setF] = useState({ display_name: "", username: "", bio: "", phone: "", banner_color: "#5a0d14", avatar_border_color: "#c1121f", name_effect: "none" });
  const [crop, setCrop] = useState<{ file: File; kind: "avatar" | "banner" } | null>(null);
  const [saving, setSaving] = useState(false);
  const avRef = useRef<HTMLInputElement>(null);
  const bnRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) setF({ display_name: profile.display_name, username: profile.username, bio: profile.bio ?? "", phone: profile.phone ?? "", banner_color: profile.banner_color ?? "#5a0d14", avatar_border_color: profile.avatar_border_color ?? "#c1121f", name_effect: profile.name_effect ?? "none" });
  }, [profile]);

  if (!profile || !user) return <PageHeader title="Configurações" />;
  const premium = profile.plan === "premium";
  const update = async (patch: Record<string, unknown>, msg = "Salvo!") => {
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) { toast.error(error.message.includes("duplicate") ? "Esse @ já está em uso" : "Erro ao salvar"); return false; }
    toast.success(msg); await refresh(); qc.invalidateQueries(); return true;
  };

  const saveProfile = async () => {
    const username = f.username.toLowerCase();
    if (!/^[a-z0-9_.]{3,24}$/.test(username)) return toast.error("Arroba inválido");
    setSaving(true);
    await update({ display_name: f.display_name.trim() || username, username, bio: f.bio.slice(0, 300), phone: f.phone, banner_color: f.banner_color, avatar_border_color: f.avatar_border_color, name_effect: premium ? f.name_effect : "none" });
    setSaving(false);
  };

  const onCropped = async (blob: Blob) => {
    if (!crop) return;
    const kind = crop.kind; setCrop(null);
    const t = toast.loading("Enviando…");
    try {
      const url = await uploadImage(user.id, blob, kind === "avatar" ? 512 : 1500);
      toast.dismiss(t);
      await update(kind === "avatar" ? { avatar_url: url } : { banner_url: url }, "Imagem atualizada");
    } catch (e) { toast.dismiss(t); toast.error((e as Error).message); }
  };

  return (
    <div>
      <PageHeader title="Configurações" />
      <Tabs defaultValue="perfil" className="p-4">
        <TabsList className="flex w-full flex-wrap">
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="conta">Conta</TabsTrigger>
          <TabsTrigger value="aparencia">Aparência</TabsTrigger>
          <TabsTrigger value="privacidade">Privacidade</TabsTrigger>
          <TabsTrigger value="avisos">Avisos</TabsTrigger>
        </TabsList>

        <TabsContent value="perfil" className="space-y-4 pt-4">
          <div className="relative h-32 overflow-hidden rounded-xl" style={profile.banner_url ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover" } : { background: f.banner_color }}>
            <div className="absolute bottom-2 right-2 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => bnRef.current?.click()}>Imagem do banner</Button>
              {profile.banner_url && <Button size="sm" variant="secondary" onClick={() => update({ banner_url: null })}>Usar cor</Button>}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div style={{ boxShadow: `0 0 0 3px ${f.avatar_border_color}` }} className="rounded-full"><Avatar user={{ ...profile, avatar_border_color: "transparent" }} size={80} /></div>
            <Button variant="outline" onClick={() => avRef.current?.click()}>Alterar foto</Button>
          </div>
          <input ref={avRef} type="file" accept="image/*" hidden onChange={(e) => { const x = e.target.files?.[0]; e.target.value = ""; if (x) setCrop({ file: x, kind: "avatar" }); }} />
          <input ref={bnRef} type="file" accept="image/*" hidden onChange={(e) => { const x = e.target.files?.[0]; e.target.value = ""; if (x) setCrop({ file: x, kind: "banner" }); }} />
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Cor do banner</Label><Input type="color" value={f.banner_color} onChange={(e) => setF({ ...f, banner_color: e.target.value })} /></div>
            <div><Label>Cor da borda da foto</Label><Input type="color" value={f.avatar_border_color} onChange={(e) => setF({ ...f, avatar_border_color: e.target.value })} /></div>
          </div>
          <div><Label>Nome</Label><Input value={f.display_name} maxLength={40} onChange={(e) => setF({ ...f, display_name: e.target.value })} /></div>
          <div><Label>Arroba</Label><Input value={f.username} onChange={(e) => setF({ ...f, username: e.target.value })} /></div>
          <div><Label>Telefone</Label><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
          <div><Label>Bio</Label><Textarea value={f.bio} maxLength={300} onChange={(e) => setF({ ...f, bio: e.target.value })} /></div>
          <div>
            <Label>Efeito no nome {!premium && <Link to="/premium" className="ml-1 text-xs text-primary">(Premium)</Link>}</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {EFFECTS.map((e) => (
                <button key={e} disabled={!premium} onClick={() => setF({ ...f, name_effect: e })} className={`rounded-lg border px-3 py-2 text-sm disabled:opacity-40 ${f.name_effect === e ? "border-primary" : "border-border"}`}>
                  <DisplayName user={{ display_name: EFFECT_LABEL[e], name_effect: e }} />
                </button>
              ))}
            </div>
          </div>
          {premium && <LinksEditor userId={user.id} />}
          <Button onClick={saveProfile} disabled={saving}>{saving ? "Salvando…" : "Salvar perfil"}</Button>
        </TabsContent>

        <TabsContent value="conta" className="pt-4"><AccountTab email={user.email ?? ""} onDeleted={() => nav({ to: "/login", replace: true })} /></TabsContent>

        <TabsContent value="aparencia" className="space-y-3 pt-4">
          <div className="grid grid-cols-2 gap-3">
            {(["dark", "light"] as const).map((t) => (
              <button key={t} onClick={() => { applyTheme(t); update({ theme: t }, "Tema salvo"); }} className={`rounded-xl border-2 p-6 font-display text-xl ${profile.theme === t ? "border-primary" : "border-border"}`}>
                {t === "dark" ? "Escuro" : "Claro"}
              </button>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="privacidade" className="space-y-4 pt-4">
          <Row label="Permitir mensagens privadas" desc="Mesmo assim, só quem se segue mutuamente pode conversar.">
            <Switch checked={profile.allow_messages} onCheckedChange={(v) => update({ allow_messages: v })} />
          </Row>
        </TabsContent>

        <TabsContent value="avisos" className="space-y-4 pt-4">
          {NOTIF.map(([k, l]) => {
            const prefs = (profile.notification_prefs ?? {}) as Record<string, boolean>;
            return <Row key={k} label={l}><Switch checked={prefs[k] !== false} onCheckedChange={(v) => update({ notification_prefs: { ...prefs, [k]: v } })} /></Row>;
          })}
        </TabsContent>
      </Tabs>
      <ImageCropper file={crop?.file ?? null} open={!!crop} aspect={crop?.kind === "avatar" ? 1 : 3} round={crop?.kind === "avatar"} onCancel={() => setCrop(null)} onDone={(b) => onCropped(b)} />
    </div>
  );
}

function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-4 rounded-xl bg-surface p-4"><div><div className="font-medium">{label}</div>{desc && <div className="text-sm text-muted-foreground">{desc}</div>}</div>{children}</div>;
}

function LinksEditor({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const { data: links = [] } = useQuery({ queryKey: ["links", userId], queryFn: async () => (await supabase.from("profile_links").select("*").eq("user_id", userId).order("position")).data ?? [] });
  const [label, setLabel] = useState(""); const [url, setUrl] = useState("");
  const add = async () => {
    if (!label || !/^https:\/\//.test(url)) return toast.error("Informe nome e link https");
    await supabase.from("profile_links").insert({ user_id: userId, label, url, position: links.length });
    setLabel(""); setUrl(""); qc.invalidateQueries({ queryKey: ["links"] });
  };
  return (
    <div className="space-y-2">
      <Label>Links no perfil</Label>
      {links.map((l) => <div key={l.id} className="flex items-center gap-2 text-sm"><span className="font-medium">{l.label}</span><span className="truncate text-muted-foreground">{l.url}</span><button className="ml-auto" onClick={async () => { await supabase.from("profile_links").delete().eq("id", l.id); qc.invalidateQueries({ queryKey: ["links"] }); }}><Trash2 size={14} /></button></div>)}
      <div className="flex gap-2"><Input placeholder="Instagram" value={label} onChange={(e) => setLabel(e.target.value)} /><Input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} /><Button onClick={add}>+</Button></div>
    </div>
  );
}

function AccountTab({ email, onDeleted }: { email: string; onDeleted: () => void }) {
  const qc = useQueryClient();
  const [newEmail, setNewEmail] = useState(email);
  const [cur, setCur] = useState(""); const [pw, setPw] = useState(""); const [pw2, setPw2] = useState("");
  const changeEmail = async () => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) toast.error(error.message); else toast.success("Confirme a alteração no novo email");
  };
  const changePw = async () => {
    if (pw.length < 6 || pw !== pw2) return toast.error("Senhas inválidas ou diferentes");
    const { error } = await supabase.auth.updateUser({ password: pw, current_password: cur } as { password: string });
    if (error) toast.error(error.message); else { toast.success("Senha alterada"); setCur(""); setPw(""); setPw2(""); }
  };
  const signOut = async () => { await qc.cancelQueries(); qc.clear(); await supabase.auth.signOut(); onDeleted(); };
  const del = async () => {
    if (!confirm("Excluir sua conta permanentemente? Isso não pode ser desfeito.")) return;
    try { await deleteMyAccount(); await signOut(); } catch (e) { toast.error((e as Error).message); }
  };
  return (
    <div className="space-y-6">
      <div className="space-y-2"><Label>Email</Label><div className="flex gap-2"><Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} /><Button onClick={changeEmail}>Alterar</Button></div></div>
      <div className="space-y-2"><Label>Alterar senha</Label>
        <Input type="password" placeholder="Senha atual" value={cur} onChange={(e) => setCur(e.target.value)} />
        <Input type="password" placeholder="Nova senha" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Input type="password" placeholder="Confirmar nova senha" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        <Button onClick={changePw}>Salvar senha</Button>
      </div>
      <div className="flex gap-2"><Button variant="outline" onClick={signOut}>Sair</Button><Button variant="destructive" onClick={del}>Excluir conta</Button></div>
    </div>
  );
}

import { useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { checkIpBlocked } from "@/lib/security.functions";
import { uploadImage } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/social/AuthLayout";
import { ImageCropper } from "@/components/social/ImageCropper";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Criar conta — NewGen Shitpost" }, { name: "description", content: "Crie sua conta na NewGen Shitpost." }, { property: "og:title", content: "Criar conta — NewGen Shitpost" }, { property: "og:description", content: "Entre para a comunidade." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Register,
});

function Register() {
  const nav = useNavigate();
  const [f, setF] = useState({ display_name: "", username: "", phone: "", email: "", password: "", confirm: "" });
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [avatar, setAvatar] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = f.username.toLowerCase().replace(/^@/, "");
    if (!/^[a-z0-9_.]{3,24}$/.test(username)) return toast.error("Arroba: 3–24 caracteres, letras minúsculas, números, _ ou .");
    if (f.password.length < 6) return toast.error("Senha precisa ter ao menos 6 caracteres");
    if (f.password !== f.confirm) return toast.error("As senhas não conferem");
    const phone = f.phone.replace(/\D/g, "");
    if (phone.length < 10) return toast.error("Informe um telefone válido com DDD");
    setBusy(true);
    try {
      const { blocked } = await checkIpBlocked();
      if (blocked) throw new Error("Cadastro bloqueado nesta rede.");
      const { data: free } = await supabase.rpc("username_available", { _u: username });
      if (!free) throw new Error("Esse @ já está em uso");
      const { data, error } = await supabase.auth.signUp({
        email: f.email, password: f.password,
        options: { emailRedirectTo: window.location.origin, data: { username, display_name: f.display_name.trim() || username, phone } },
      });
      if (error) throw new Error(error.message.includes("registered") ? "Email já cadastrado" : error.message);
      if (data.session && avatar && data.user) {
        const url = await uploadImage(data.user.id, avatar.blob, 512);
        await supabase.from("profiles").update({ avatar_url: url }).eq("id", data.user.id);
      }
      if (data.session) nav({ to: "/feed" }); else setSent(true);
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  };

  if (sent) return (
    <AuthLayout title="Confira seu email" subtitle={`Enviamos um link de confirmação para ${f.email}.`}>
      <p className="text-sm text-muted-foreground">Depois de confirmar, entre e adicione sua foto de perfil nas configurações.</p>
      <Button asChild className="mt-6 w-full"><Link to="/login">Ir para o login</Link></Button>
    </AuthLayout>
  );

  return (
    <AuthLayout title="Criar conta" subtitle="Entre para a comunidade.">
      <form onSubmit={submit} className="space-y-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => ref.current?.click()} className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted text-xs text-muted-foreground">
            {avatar ? <img src={avatar.url} alt="" className="h-full w-full object-cover" /> : "Foto"}
          </button>
          <span className="text-sm text-muted-foreground">Foto de perfil (opcional)</span>
          <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const x = e.target.files?.[0]; e.target.value = ""; if (x) setCropFile(x); }} />
        </div>
        <div><Label>Nome (pode ter espaço)</Label><Input required maxLength={40} value={f.display_name} onChange={set("display_name")} placeholder="Zé do Meme" /></div>
        <div><Label>Arroba (único)</Label><Input required value={f.username} onChange={set("username")} placeholder="zedomeme" /></div>
        <div><Label>Telefone (WhatsApp)</Label><Input required type="tel" value={f.phone} onChange={set("phone")} placeholder="(85) 99999-9999" /><p className="mt-1 text-xs text-muted-foreground">Usado para confirmar que você é do grupo.</p></div>
        <div><Label>Email</Label><Input required type="email" value={f.email} onChange={set("email")} /></div>
        <div><Label>Senha</Label><Input required type="password" value={f.password} onChange={set("password")} /></div>
        <div><Label>Confirmar senha</Label><Input required type="password" value={f.confirm} onChange={set("confirm")} /></div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Criando…" : "Criar conta"}</Button>
        <p className="text-center text-sm text-muted-foreground">Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link></p>
      </form>
      <ImageCropper file={cropFile} open={!!cropFile} aspect={1} round onCancel={() => setCropFile(null)} onDone={(blob, url) => { setAvatar({ blob, url }); setCropFile(null); }} />
    </AuthLayout>
  );
}

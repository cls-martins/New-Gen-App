import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { checkIpBlocked, recordLoginIp } from "@/lib/security.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/social/AuthLayout";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Entrar — New Gen Shitpost" }, { name: "description", content: "Entre na sua conta New Gen Shitpost." }, { property: "og:title", content: "Entrar — New Gen Shitpost" }, { property: "og:description", content: "Entre na sua conta." }] }),
  component: Login,
});

function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { blocked } = await checkIpBlocked();
      if (blocked) throw new Error("Acesso bloqueado nesta rede.");
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message.includes("Invalid") ? "Email ou senha incorretos" : error.message.includes("confirm") ? "Confirme seu email antes de entrar" : error.message);
      const { data: p } = await supabase.from("profiles").select("status").eq("id", data.user.id).maybeSingle();
      if (p?.status === "banned") { await supabase.auth.signOut(); throw new Error("Esta conta foi banida."); }
      const r = await recordLoginIp();
      if (r.blocked) { await supabase.auth.signOut(); throw new Error("Acesso bloqueado nesta rede."); }
      nav({ to: "/feed" });
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  };

  return (
    <AuthLayout title="Entrar" subtitle="Bem-vindo de volta à resenha.">
      <form onSubmit={submit} className="space-y-4">
        <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><Label htmlFor="pw">Senha</Label><Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <div className="text-right"><Link to="/forgot-password" className="text-sm text-primary hover:underline">Esqueci minha senha</Link></div>
        <Button type="submit" className="w-full" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</Button>
        <p className="text-center text-sm text-muted-foreground">Não tem conta? <Link to="/register" className="text-primary hover:underline">Cadastre-se</Link></p>
      </form>
    </AuthLayout>
  );
}

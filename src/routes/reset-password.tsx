import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout } from "@/components/social/AuthLayout";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nova senha — NewGen Shitpost" }, { name: "description", content: "Defina uma nova senha." }, { property: "og:title", content: "Nova senha — NewGen Shitpost" }, { property: "og:description", content: "Defina uma nova senha." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Reset,
});

function Reset() {
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [c, setC] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Mínimo de 6 caracteres");
    if (pw !== c) return toast.error("As senhas não conferem");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return toast.error("Link inválido ou expirado");
    toast.success("Senha alterada!");
    nav({ to: "/feed" });
  };
  return (
    <AuthLayout title="Nova senha">
      <form onSubmit={submit} className="space-y-4">
        <Input type="password" required placeholder="Nova senha" value={pw} onChange={(e) => setPw(e.target.value)} />
        <Input type="password" required placeholder="Confirmar nova senha" value={c} onChange={(e) => setC(e.target.value)} />
        <Button type="submit" className="w-full">Salvar</Button>
      </form>
    </AuthLayout>
  );
}

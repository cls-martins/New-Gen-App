import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthLayout } from "@/components/social/AuthLayout";
import { toast } from "sonner";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Recuperar senha — New Gen Shitpost" }, { name: "description", content: "Receba um link para redefinir sua senha." }, { property: "og:title", content: "Recuperar senha" }, { property: "og:description", content: "Redefina sua senha." }] }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast.error(error.message); else setSent(true);
  };
  return (
    <AuthLayout title="Esqueci a senha" subtitle={sent ? "Se o email existir, você receberá um link." : "Enviaremos um link para seu email."}>
      {!sent && (
        <form onSubmit={submit} className="space-y-4">
          <Input type="email" required placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" className="w-full">Enviar link</Button>
        </form>
      )}
      <Link to="/login" className="mt-4 block text-center text-sm text-primary hover:underline">Voltar ao login</Link>
    </AuthLayout>
  );
}

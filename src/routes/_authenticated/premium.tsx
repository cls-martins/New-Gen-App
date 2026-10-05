import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { premiumLink } from "@/lib/social";
import { PageHeader } from "@/components/social/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/premium")({
  head: () => ({ meta: [{ title: "Premium — New Gen Shitpost" }, { name: "description", content: "Mais posts, links no perfil e efeitos no nome." }, { property: "og:title", content: "Premium" }, { property: "og:description", content: "Seja Premium." }] }),
  component: Premium,
});

function Premium() {
  const { profile } = useAuth();
  const { data: limits = [] } = useQuery({ queryKey: ["limits"], queryFn: async () => (await supabase.from("plan_limits").select("*")).data ?? [] });
  const lim = (p: string) => limits.find((l) => l.plan === p)?.daily_posts;
  const perks = [`${lim("premium") ?? "Mais"} posts por dia (free: ${lim("free") ?? 6})`, "Links fixados no perfil (Instagram, YouTube, TikTok…)", "Efeitos no nome: gradiente, brilho, fogo, cromado", "Selo Premium no perfil"];
  return (
    <div>
      <PageHeader title="Premium" />
      <div className="p-5">
        <div className="overflow-hidden rounded-2xl bg-brand p-8 text-primary-foreground shadow-glow">
          <Crown size={40} />
          <h2 className="mt-3 font-display text-5xl">New Gen Premium</h2>
          <p className="mt-2 text-primary-foreground/80">Destaque-se na comunidade.</p>
          <ul className="mt-6 space-y-3">{perks.map((p) => <li key={p} className="flex gap-2"><Check className="shrink-0" />{p}</li>)}</ul>
          {profile?.plan === "premium" ? (
            <div className="mt-8 font-display text-2xl">Você já é Premium 👑</div>
          ) : (
            <Button asChild size="lg" variant="secondary" className="mt-8 w-full">
              <a href={premiumLink(profile?.username)} target="_blank" rel="noopener noreferrer">Assinar pelo WhatsApp</a>
            </Button>
          )}
        </div>
        <p className="mt-4 text-center text-sm text-muted-foreground">O pagamento é combinado pelo WhatsApp. Após confirmação, um admin ativa seu Premium.</p>
      </div>
    </div>
  );
}

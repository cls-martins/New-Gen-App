import { createFileRoute, Link } from "@tanstack/react-router";
import { NAME_EFFECTS, AVATAR_FRAMES, BANNER_FRAMES, COMMENT_STYLES } from "@/lib/premium-fx";
import { useQuery } from "@tanstack/react-query";
import { Check, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { premiumLink } from "@/lib/social";
import { PageHeader } from "@/components/social/AppShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/premium")({
  head: () => ({ meta: [{ title: "Premium — NewGen Shitpost" }, { name: "description", content: "Mais posts, links no perfil e efeitos no nome." }, { property: "og:title", content: "Premium — NewGen Shitpost" }, { property: "og:description", content: "Seja Premium." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Premium,
});

function Premium() {
  const { profile } = useAuth();
  const { data: limits = [] } = useQuery({ queryKey: ["limits"], queryFn: async () => (await supabase.from("plan_limits").select("*")).data ?? [] });
  const lim = (p: string) => limits.find((l) => l.plan === p)?.daily_posts;
  const perks = [`${lim("premium") ?? "Mais"} posts por dia (free: ${lim("free") ?? 6})`, "Até 3 posts fixados no perfil", "Banner animado (GIF)", `${NAME_EFFECTS.length} efeitos no nome`, `${AVATAR_FRAMES.length} molduras animadas da foto`, `${BANNER_FRAMES.length} molduras do banner`, `${COMMENT_STYLES.length} estilos de comentário`, "Links no perfil (Instagram, YouTube, TikTok…)", "Selo Premium (coroa)"];
  return (
    <div>
      <PageHeader title="Premium" />
      <div className="p-5">
        <div className="overflow-hidden rounded-lg bg-brand p-4 text-primary-foreground shadow-glow sm:p-8">
          <Crown size={40} />
          <h2 className="mt-3 font-display text-3xl sm:text-5xl">NewGen Premium</h2>
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
        {profile?.plan === "premium" && <Button asChild variant="outline" className="mt-4 w-full"><Link to="/settings">Personalizar meu Premium</Link></Button>}
        <p className="mt-4 text-center text-sm"><Link to="/planos" className="text-primary hover:underline">Comparar planos</Link></p>
        <p className="mt-2 text-center text-sm text-muted-foreground">O pagamento é combinado pelo WhatsApp. Após confirmação, um admin ativa seu Premium.</p>
      </div>
    </div>
  );
}

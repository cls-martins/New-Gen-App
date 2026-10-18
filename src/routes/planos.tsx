import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Crown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { premiumLink } from "@/lib/social";
import { NAME_EFFECTS, AVATAR_FRAMES, BANNER_FRAMES, COMMENT_STYLES } from "@/lib/premium-fx";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos — NewGen Shitpost" },
      { name: "description", content: "Compare o plano Grátis e o Premium da NewGen Shitpost." },
      { property: "og:title", content: "Planos — NewGen Shitpost" },
      { property: "og:description", content: "Grátis ou Premium: veja o que cada plano libera na NewGen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Planos,
});

const ROWS: [string, string | boolean, string | boolean][] = [
  ["Posts por dia", "6", "30"],
  ["Texto, foto, vídeo, áudio, link e enquete", true, true],
  ["Curtidas, comentários, amizades e mensagens", true, true],
  ["Contador de visualizações", true, true],
  ["Posts fixados no perfil", false, "Até 3"],
  ["Banner animado (GIF)", false, true],
  ["Efeitos no nome", false, `${NAME_EFFECTS.length} opções`],
  ["Molduras animadas da foto", false, `${AVATAR_FRAMES.length} opções`],
  ["Molduras animadas do banner", false, `${BANNER_FRAMES.length} opções`],
  ["Estilos de comentário", false, `${COMMENT_STYLES.length} opções`],
  ["Links no perfil", false, true],
  ["Selo Premium (coroa)", false, true],
];

function Cell({ v }: { v: string | boolean }) {
  if (v === true) return <Check className="mx-auto text-primary" aria-label="Sim" />;
  if (v === false) return <X className="mx-auto text-muted-foreground" aria-label="Não" />;
  return <span className="font-semibold">{v}</span>;
}

function Planos() {
  return (
    <div className="min-h-screen bg-background px-5 py-10 text-foreground">
      <div className="mx-auto max-w-3xl">
        <Link to="/" className="font-display text-xl">NewGen</Link>
        <h1 className="home-intro mt-8 font-display text-5xl sm:text-6xl">Planos</h1>
        <p className="home-intro-copy mt-3 text-muted-foreground">Comece grátis. Quer se destacar na resenha? Vira Premium.</p>
        <div className="home-intro-actions mt-8 overflow-hidden rounded-xl border-2 border-foreground shadow-brutal">
          <table className="w-full text-sm sm:text-base">
            <thead className="bg-muted">
              <tr><th className="p-3 text-left">Recurso</th><th className="p-3">Grátis</th><th className="p-3 text-primary"><span className="inline-flex items-center gap-1"><Crown size={16} />Premium</span></th></tr>
            </thead>
            <tbody>
              {ROWS.map(([l, a, b]) => (
                <tr key={l} className="border-t border-border"><td className="p-3">{l}</td><td className="p-3 text-center"><Cell v={a} /></td><td className="p-3 text-center"><Cell v={b} /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" variant="outline" className="home-button"><Link to="/register">Criar conta grátis</Link></Button>
          <Button asChild size="lg" className="home-button"><a href={premiumLink()} target="_blank" rel="noopener noreferrer">Assinar Premium pelo WhatsApp</a></Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">O pagamento é combinado pelo WhatsApp. Após a confirmação, o admin ativa seu Premium.</p>
      </div>
    </div>
  );
}

import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { MessageSquare, Heart, Users, Crown, BarChart3, Image as ImageIcon, Instagram, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/social/AppShell";
import { Button } from "@/components/ui/button";
import { homepageExtraButton } from "@/lib/homepage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NewGen Shitpost Web App" },
      { name: "description", content: "A rede social oficial da comunidade NewGen." },
      { property: "og:title", content: "NewGen Shitpost" },
      { property: "og:description", content: "Agora a NewGen tem rede social própria. Poste memes, faça amizades e converse." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: ImageIcon, t: "Poste memes", d: "Poste seus melhores memes em imagens, vídeos e áudios." },
  { icon: Heart, t: "Curte e comente", d: "Aqui você pode comentar nos posts, curtir e colocar fotos nos comentários." },
  { icon: Users, t: "Amigos e seguidores", d: "Monte seu grupinho de amigos por aqui!" },
  { icon: MessageSquare, t: "Mensagens privadas", d: "Bate-papo com quem te segue de volta." },
  { icon: BarChart3, t: "Enquetes", d: "Poste enquetes e divirta o público." },
  { icon: Crown, t: "Premium", d: "Temos a versão Premium com efeito no nome, link no perfil e muito mais." },
];

function Index() {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (user || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.removeAttribute("data-pending");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });
    document.querySelectorAll(".home-reveal").forEach((element) => {
      if (element.getBoundingClientRect().top < window.innerHeight) return;
      element.setAttribute("data-pending", "");
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, [user]);
  if (!loading && user) return <Navigate to="/feed" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo className="text-lg sm:text-2xl" />
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" className="border-2 border-foreground px-3 font-bold"><Link to="/login">Entrar</Link></Button>
          <Button asChild className="border-2 border-foreground px-3 font-bold"><Link to="/register">Criar conta</Link></Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 md:pt-20">
        <span className="inline-block -rotate-2 rounded-sm border-2 border-foreground bg-primary px-3 py-1 text-xs font-bold uppercase text-primary-foreground">
          A NewGen tem rede social!
        </span>
        <h1 className="home-intro mt-6 font-display text-5xl leading-[0.95] sm:text-6xl md:text-8xl">
          A <span className="text-primary">NewGen</span><br />agora é seu<br />app favorito
        </h1>
        <p className="home-intro-copy mt-6 max-w-xl text-lg text-muted-foreground">
          A sua comunidade de memes favorita tem casa própria para a bagunça. Poste e faça novas amizades!
        </p>
        <div className="home-intro-actions mt-8 flex flex-wrap gap-4">
          <Button asChild className="home-button shadow-brutal border-2 border-foreground px-7 py-4 font-display text-xl"><Link to="/register">
            Criar nova conta
          </Link></Button>
          <Button asChild variant="outline" className="home-button border-2 border-foreground px-7 py-4 font-display text-xl"><Link to="/login">
            Já tenho conta
          </Link></Button>
        </div>
      </section>

      <section className="home-reveal mx-auto max-w-6xl border-t border-border px-5 py-16">
        <h2 className="font-display text-4xl md:text-5xl">O que a NewGen<span className="text-primary">entrega para você</span></h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, t, d }, i) => (
            <div key={t} className={`home-feature rounded-md border-2 border-foreground bg-card p-6 ${i % 2 ? "md:rotate-1" : "md:-rotate-1"}`}>
              <Icon className={i % 2 ? "text-accent" : "text-primary"} size={28} />
              <h3 className="mt-4 font-display text-2xl">{t}</h3>
              <p className="mt-2 text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="home-reveal border-y-2 border-foreground bg-primary text-primary-foreground">
        <div className="mx-auto max-w-6xl px-5 py-12 md:py-16">
          <h2 className="font-display text-4xl md:text-6xl">Participe da resenha!</h2>
          <p className="mt-3 max-w-lg font-medium">Crie sua conta e faça parte da comunidade!</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="outline" className="home-button border-2 border-primary-foreground text-foreground px-6 py-3 font-display text-lg"><Link to="/register">Criar conta grátis</Link></Button>
            <Button asChild variant="outline" className="home-button border-2 border-primary-foreground text-foreground px-6 py-3 font-display text-lg"><a href="https://instagram.com/newgen.post" target="_blank" rel="noopener noreferrer">
              <Instagram size={20} /> @newgen.post
            </a></Button>
            <Button asChild variant="outline" className="home-button border-2 border-primary-foreground text-foreground px-6 py-3 font-display text-lg">
              <a href={homepageExtraButton.link} target="_blank" rel="noopener noreferrer">{homepageExtraButton.text}<ArrowUpRight size={20} /></a>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t-2 border-foreground px-5 py-6 text-center text-sm text-muted-foreground">
        © NewGen Shitpost — Todos os direitos reservados. Feito com o poder da resenha!
      </footer>
    </div>
  );
}

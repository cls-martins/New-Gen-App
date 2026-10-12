import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { MessageSquare, Heart, Users, Crown, BarChart3, Image as ImageIcon, Instagram } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/social/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NewGen Shitpost — a rede social da comunidade" },
      { name: "description", content: "A rede social oficial da comunidade NewGen Shitpost: memes, amizades, mensagens e enquetes." },
      { property: "og:title", content: "NewGen Shitpost — a rede social da comunidade" },
      { property: "og:description", content: "Agora a NewGen tem rede social própria. Poste memes, faça amizades e converse." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: ImageIcon, t: "Memes sem limite de zoeira", d: "Imagem, vídeo, áudio e link no mesmo post." },
  { icon: Heart, t: "Curte e comenta", d: "Respostas, curtidas e fotos nos comentários." },
  { icon: Users, t: "Amigos e seguidores", d: "Monte sua panela dentro da comunidade." },
  { icon: MessageSquare, t: "Mensagens privadas", d: "Chat em tempo real com quem te segue de volta." },
  { icon: BarChart3, t: "Enquetes", d: "Bota a galera pra decidir as maiores tretas." },
  { icon: Crown, t: "Premium", d: "Nome com efeito, links no perfil e mais posts." },
];

const ticker = "MEMES • RESENHA • FIGURINHAS • ENQUETES • AMIZADES • NEWGEN • ";

function Index() {
  const { user, loading } = useAuth();
  if (!loading && user) return <Navigate to="/feed" replace />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Logo className="text-2xl" />
        <div className="flex gap-2">
          <Link to="/login" className="rounded-md border-2 border-foreground px-4 py-2 text-sm font-bold">Entrar</Link>
          <Link to="/register" className="rounded-md border-2 border-foreground bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Criar conta</Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pb-16 pt-10 md:pt-20">
        <span className="inline-block -rotate-2 rounded-sm border-2 border-foreground bg-accent px-3 py-1 text-xs font-bold uppercase text-accent-foreground">
          Nova rede social da comunidade
        </span>
        <h1 className="mt-6 font-display text-6xl leading-[0.9] md:text-8xl">
          A <span className="text-primary">NewGen</span><br />agora tem<br />rede social.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          A sua comunidade de memes favorita saiu do grupo e ganhou casa própria. Poste, curta, comente, faça amizades e converse com a galera da NewGen Shitpost.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link to="/register" className="shadow-brutal rounded-md border-2 border-foreground bg-primary px-7 py-4 font-display text-xl text-primary-foreground transition-transform hover:-translate-y-0.5">
            Entrar pra comunidade
          </Link>
          <Link to="/login" className="rounded-md border-2 border-foreground px-7 py-4 font-display text-xl">
            Já tenho conta
          </Link>
        </div>
      </section>

      <div className="overflow-hidden border-y-2 border-foreground bg-primary py-3 text-primary-foreground">
        <p className="whitespace-nowrap font-display text-2xl">{ticker.repeat(6)}</p>
      </div>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="font-display text-4xl md:text-5xl">O que rola <span className="text-accent">por aqui</span></h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, t, d }, i) => (
            <div key={t} className={`rounded-md border-2 border-foreground bg-card p-6 ${i % 2 ? "md:rotate-1" : "md:-rotate-1"}`}>
              <Icon className={i % 2 ? "text-accent" : "text-primary"} size={28} />
              <h3 className="mt-4 font-display text-2xl">{t}</h3>
              <p className="mt-2 text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="shadow-brutal rounded-md border-2 border-foreground bg-accent p-8 text-accent-foreground md:p-12">
          <h2 className="font-display text-4xl md:text-6xl">Bora pra resenha?</h2>
          <p className="mt-3 max-w-lg font-medium">Cria sua conta em menos de um minuto e já sai postando.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/register" className="rounded-md border-2 border-foreground bg-background px-6 py-3 font-display text-lg text-foreground">Criar conta grátis</Link>
            <a href="https://instagram.com/newgen.post" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border-2 border-foreground px-6 py-3 font-display text-lg">
              <Instagram size={20} /> @newgen.post
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t-2 border-foreground px-5 py-6 text-center text-sm text-muted-foreground">
        © NewGen Shitpost — feito pela comunidade, pra comunidade.
      </footer>
    </div>
  );
}

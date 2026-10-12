import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Logo } from "@/components/social/AppShell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NewGen Shitpost — a rede social da comunidade" },
      { name: "description", content: "Poste memes, faça amizades, converse e participe da comunidade NewGen Shitpost." },
      { property: "og:title", content: "NewGen Shitpost" },
      { property: "og:description", content: "A rede social da comunidade NewGen Shitpost." },
    ],
  }),
  component: Index,
});

function Index() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><Logo className="animate-pulse text-4xl" /></div>;
  return <Navigate to={user ? "/feed" : "/login"} replace />;
}

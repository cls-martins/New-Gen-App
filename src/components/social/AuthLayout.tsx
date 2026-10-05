import type { ReactNode } from "react";
import { Logo } from "./AppShell";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-brand p-12 lg:flex lg:flex-col lg:justify-between">
        <Logo className="text-4xl text-primary-foreground" />
        <div>
          <p className="font-display text-7xl leading-[0.95] text-primary-foreground">Posta.<br />Zoa.<br />Conecta.</p>
          <p className="mt-6 max-w-sm text-lg text-primary-foreground/80">A rede social da comunidade. Memes, amizades, conversas e muita resenha.</p>
        </div>
        <span className="text-sm text-primary-foreground/60">© New Gen Shitpost</span>
      </div>
      <div className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <Logo className="mb-8 block text-3xl lg:hidden" />
          <h1 className="font-display text-4xl">{title}</h1>
          {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

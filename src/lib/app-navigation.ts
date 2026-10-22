/** Publishing belongs on the feed and profile pages, never over chat or settings. */
export function canComposeOnPage(pathname: string) {
  return pathname === "/feed" || /^\/u\/[^/]+\/?$/.test(pathname);
}

export const MOBILE_NAV_LABELS = ["Início", "Pesquisar", "Avisos", "Mensagens", "Meu perfil", "Premium", "Admin"] as const;
/** Premium visual options. Each list must keep at least 15 options (plus "none"). */
export type FxOption = { key: string; label: string };

export const NAME_EFFECTS: FxOption[] = [
  { key: "gradient", label: "Ácido" }, { key: "glow", label: "Brilho" }, { key: "fire", label: "Fogo" },
  { key: "chrome", label: "Cromado" }, { key: "glitch", label: "Glitch" }, { key: "cyber", label: "Cyber Red" },
  { key: "matrix", label: "Matrix" }, { key: "strobe", label: "Estrobo" }, { key: "pixel", label: "Pixel" },
  { key: "tarja", label: "Tarja" }, { key: "underline", label: "Sublinhado" }, { key: "laser", label: "Laser" },
  { key: "shake", label: "Shake" }, { key: "outline", label: "Contorno" }, { key: "cyan", label: "Ciano" },
  { key: "cursor", label: "Terminal" },
];

export const AVATAR_FRAMES: FxOption[] = [
  { key: "caution", label: "Fita zebrada" }, { key: "neon", label: "Neon pulsante" }, { key: "glitch", label: "Glitch" },
  { key: "hud", label: "HUD" }, { key: "spikes", label: "Espinhos" }, { key: "fire", label: "Fogo" },
  { key: "radar", label: "Radar" }, { key: "sticker", label: "Sticker" }, { key: "target", label: "Mira" },
  { key: "pixel", label: "Pixel" }, { key: "toxic", label: "Tóxico" }, { key: "rec", label: "REC" },
  { key: "chain", label: "Corrente" }, { key: "ghost", label: "Espectro" }, { key: "gold", label: "Ouro VIP" },
];

export const BANNER_FRAMES: FxOption[] = [
  { key: "caution", label: "Caution" }, { key: "crt", label: "CRT" }, { key: "neonline", label: "Linha neon" },
  { key: "hud", label: "Cantos HUD" }, { key: "tape", label: "Durex" }, { key: "glitch", label: "Glitch" },
  { key: "wire", label: "Arame" }, { key: "brutal", label: "Sombra brutal" }, { key: "film", label: "Filme" },
  { key: "grid", label: "Grade cyber" }, { key: "laser", label: "Laser" }, { key: "stamp", label: "Carimbo" },
  { key: "metal", label: "Chapa" }, { key: "eq", label: "Equalizador" }, { key: "double", label: "Dupla" },
];

export const COMMENT_STYLES: FxOption[] = [
  { key: "acid", label: "Ácido" }, { key: "brutal", label: "Brutal" }, { key: "dashed", label: "Pontilhado" },
  { key: "hud", label: "HUD" }, { key: "caution", label: "Caution" }, { key: "glow", label: "Brilho" },
  { key: "matrix", label: "Matrix" }, { key: "red", label: "Alerta" }, { key: "cyan", label: "Ciano" },
  { key: "tape", label: "Durex" }, { key: "invert", label: "Invertido" }, { key: "scan", label: "Scan" },
  { key: "pulse", label: "Pulso" }, { key: "sticker", label: "Sticker" }, { key: "terminal", label: "Terminal" },
];

export const fxClass = (prefix: string, key: string | null | undefined) => (key && key !== "none" ? `${prefix}-${key}` : "");

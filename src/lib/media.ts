import { supabase } from "@/integrations/supabase/client";

export const LIMITS = {
  imageMB: 15,
  videoMB: 50,
  audioMB: 20,
  video: ["video/mp4", "video/webm", "video/quicktime"],
  audio: ["audio/mpeg", "audio/mp3", "audio/ogg", "audio/wav", "audio/webm", "audio/aac", "audio/mp4", "audio/x-m4a"],
};

/** Downscale + re-encode an image to WebP to save storage. */
export async function compressImage(src: Blob, maxSide = 1600, quality = 0.8): Promise<Blob> {
  const bmp = await createImageBitmap(src);
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  return new Promise((res) => canvas.toBlob((b) => res(b ?? src), "image/webp", quality));
}

/** Upload into the user's folder and return a long-lived signed URL. */
export async function uploadMedia(userId: string, blob: Blob, ext: string): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, blob, { contentType: blob.type || undefined });
  if (error) throw new Error("Falha no upload: " + error.message);
  const { data, error: e2 } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (e2 || !data) throw new Error("Falha ao gerar link do arquivo");
  return data.signedUrl;
}

export async function uploadImage(userId: string, blob: Blob, maxSide = 1600) {
  const small = await compressImage(blob, maxSide);
  return uploadMedia(userId, small, "webp");
}

export function validateFile(file: File, kind: "video" | "audio") {
  const max = kind === "video" ? LIMITS.videoMB : LIMITS.audioMB;
  const types = kind === "video" ? LIMITS.video : LIMITS.audio;
  if (!types.includes(file.type) && !file.type.startsWith(kind + "/")) return `Formato de ${kind === "video" ? "vídeo" : "áudio"} não suportado`;
  if (file.size > max * 1024 * 1024) return `Arquivo maior que ${max}MB. Use um link externo.`;
  return null;
}

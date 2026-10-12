import { supabase } from "@/integrations/supabase/client";

export async function followUser(me: string, other: string) {
  const { error } = await supabase.from("follows").insert({ follower_id: me, following_id: other });
  if (error) throw new Error("Não foi possível seguir");
}
export async function unfollowUser(me: string, other: string) {
  await supabase.from("follows").delete().eq("follower_id", me).eq("following_id", other);
}
export async function sendFriendRequest(me: string, other: string) {
  const { error } = await supabase.from("friend_requests").insert({ sender_id: me, receiver_id: other });
  if (error) throw new Error("Pedido já enviado");
}
export async function openConversation(me: string, other: string) {
  const a = me < other ? me : other; const b = me < other ? other : me;
  const { data: existing } = await supabase.from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
  if (existing) return existing.id;
  const { data, error } = await supabase.from("conversations").insert({ user_a: a, user_b: b }).select("id").single();
  if (error) throw new Error("Vocês precisam se seguir mutuamente para conversar");
  return data.id;
}

export const POST_SELECT = `
  id, content, created_at, author_id,
  author:profiles!posts_author_id_fkey(id, username, display_name, avatar_url, avatar_border_color, name_effect, plan),
  post_media(id, kind, url),
  polls(id, question, poll_options(id, label, position), poll_votes(option_id, user_id)),
  post_likes(user_id),
  comments(count)
`;

export const PREMIUM_WHATSAPP = "5585985833136";
export function premiumLink(username?: string) {
  const msg = `Olá! Quero assinar o *Premium* da NewGen Shitpost.\n\nUsuário: @${username ?? ""}\nPlano: Premium\n\nComo faço o pagamento?`;
  return `https://wa.me/${PREMIUM_WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

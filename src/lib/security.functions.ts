import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function clientIp() {
  return (
    getRequestHeader("cf-connecting-ip") ||
    getRequestHeader("x-real-ip") ||
    (getRequestHeader("x-forwarded-for") || "").split(",")[0]?.trim() ||
    "unknown"
  );
}

/** Public: is the caller's IP blocked? Called before login/signup. */
export const checkIpBlocked = createServerFn({ method: "POST" }).handler(async () => {
  const ip = clientIp();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("blocked_ips").select("ip").eq("ip", ip).maybeSingle();
  return { blocked: !!data };
});

/** Authenticated: record the IP of the signed-in user (for admin monitoring). */
export const recordLoginIp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ip = clientIp();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: blocked } = await supabaseAdmin.from("blocked_ips").select("ip").eq("ip", ip).maybeSingle();
    await supabaseAdmin.from("login_ips").upsert({ user_id: context.userId, ip, last_seen: new Date().toISOString() });
    return { blocked: !!blocked };
  });

/** Authenticated: permanently delete own account. */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error("Não foi possível excluir a conta");
    return { ok: true };
  });

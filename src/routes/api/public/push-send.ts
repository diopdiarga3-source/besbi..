import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { buildPushHTTPRequest } from "@pushforge/builder";

// Appelé par un déclencheur de la base à chaque nouvelle notification : envoie l'alerte sur les téléphones abonnés.
export const Route = createFileRoute("/api/public/push-send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PUSH_HOOK_SECRET"];
        const sig = request.headers.get("x-push-secret") ?? "";
        if (!secret || sig.length !== secret.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(secret))) {
          return new Response("Unauthorized", { status: 401 });
        }
        const parsed = z.object({ notification_id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
        if (!parsed.success) return new Response("Bad request", { status: 400 });

        const privateJWK = process.env["VAPID_PRIVATE_JWK"];
        if (!privateJWK) return new Response("Not configured", { status: 500 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: n } = await supabaseAdmin.from("notifications").select("user_id, title, body, link").eq("id", parsed.data.notification_id).maybeSingle();
        if (!n) return new Response("ok");
        const { data: subs = [] } = await supabaseAdmin.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("user_id", n.user_id);

        await Promise.all((subs ?? []).map(async (s) => {
          try {
            const { endpoint, headers, body } = await buildPushHTTPRequest({
              privateJWK,
              subscription: { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              message: {
                payload: { title: n.title, body: n.body ?? "", url: n.link ?? "/notifications" },
                adminContact: "mailto:contact@besbi.app",
              },
            });
            const res = await fetch(endpoint, { method: "POST", headers, body });
            if (res.status === 404 || res.status === 410) {
              await supabaseAdmin.from("push_subscriptions").delete().eq("id", s.id);
            } else if (!res.ok) {
              console.error(`Push failed [${res.status}]: ${await res.text()}`);
            }
          } catch (e) {
            console.error("Push error", e);
          }
        }));
        return new Response("ok");
      },
    },
  },
});

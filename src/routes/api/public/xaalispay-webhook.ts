import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Webhook XaalisPay Connect : signature HMAC-SHA256 "t=..,v1=.." sur "{t}.{corps brut}".
export const Route = createFileRoute("/api/public/xaalispay-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["XAALISPAY_WEBHOOK_SECRET"];
        const raw = await request.text();
        const header = request.headers.get("x-xaalispay-signature") ?? "";
        const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2) as [string, string]));
        const t = Number(parts["t"]);
        if (!secret || !parts["v1"] || !t || Math.abs(Date.now() / 1000 - t) > 300) return new Response("Invalid signature", { status: 401 });
        const expected = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
        const a = Buffer.from(expected), b = Buffer.from(parts["v1"]);
        if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response("Invalid signature", { status: 401 });

        const evt = JSON.parse(raw) as { type?: string; data?: { transaction_id?: string; status?: string; metadata?: { booking_id?: string; kind?: string; method?: string } } };
        const d = evt.data;
        const bookingId = d?.metadata?.booking_id;
        if (!d?.transaction_id || !bookingId || !/^[0-9a-f-]{36}$/i.test(bookingId)) return new Response("ok");
        const ok = evt.type === "transaction.funded" || evt.type === "transaction.released";
        const failed = ["transaction.failed", "transaction.cancelled", "transaction.expired", "transaction.refunded"].includes(evt.type ?? "");
        if (!ok && !failed) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: tx } = await supabaseAdmin.from("transactions").select("id, status").eq("reference", d.transaction_id).maybeSingle();
        if (!tx || tx.status === "succeeded") return new Response("ok"); // inconnu ou déjà traité (idempotence)
        const { data: bk } = await supabaseAdmin.from("bookings").select("id, client_id, provider_id").eq("id", bookingId).single();
        if (!bk) return new Response("ok");

        if (ok) {
          await supabaseAdmin.from("transactions").update({ status: "succeeded" }).eq("id", tx.id);
          await supabaseAdmin.from("bookings").update({ payment_status: "paid", payment_method: d.metadata?.method ?? null, payment_reference: d.transaction_id }).eq("id", bookingId);
          await supabaseAdmin.from("notifications").insert([
            { user_id: bk.client_id, title: "Paiement confirmé 🎉", body: "Votre paiement est confirmé, votre date est bloquée.", link: "/reservations" },
            { user_id: bk.provider_id, title: "Commande payée", body: "Un client a payé sa commande via Bës bi. Vous serez reversé après la prestation.", link: "/pro/commandes" },
          ]);
        } else {
          await supabaseAdmin.from("transactions").update({ status: "failed" }).eq("id", tx.id);
          await supabaseAdmin.from("notifications").insert({ user_id: bk.client_id, title: "Paiement non abouti", body: "Le paiement n'a pas abouti. Vous pouvez réessayer.", link: "/reservations" });
        }
        return new Response("ok");
      },
    },
  },
});

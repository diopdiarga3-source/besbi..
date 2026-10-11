import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DEPOSIT_RATE } from "@/lib/format";

// Compte connecté « Trésorerie BesBi » (bénéficiaire de tous les acomptes).
const DEFAULT_BENEFICIARY = "1c2d7cfa-39c4-45f3-9136-58cdc174fc4c";
const opMap: Record<string, string> = { wave: "wave", orange_money: "orange" };

// Crée la transaction d'acompte (50 %) chez XaalisPay Connect et renvoie le lien de paiement.
export const createDepositCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ bookingId: z.string().uuid(), method: z.enum(["wave", "orange_money"]), balance: z.boolean().optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sk = process.env["XAALISPAY_SECRET_KEY"];
    if (!sk) return { paymentUrl: null as string | null, error: "Paiement en ligne indisponible pour le moment" };
    const base = (process.env["XAALISPAY_API_URL"] || "https://xaalispay.up.railway.app").replace(/\/$/, "");
    const envBen = process.env["XAALISPAY_BENEFICIARY_ID"] ?? "";
    const beneficiary = /^[0-9a-f-]{36}$/i.test(envBen) ? envBen : DEFAULT_BENEFICIARY;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: b } = await supabaseAdmin.from("bookings").select("id, client_id, total, payment_status").eq("id", data.bookingId).single();
    if (!b || b.client_id !== context.userId) throw new Error("Réservation introuvable");
    if (b.payment_status === "paid") throw new Error("Cette réservation est déjà payée");
    const balance = false;
    const amount = Math.ceil(b.total * DEPOSIT_RATE);

    const { data: prof } = await supabaseAdmin.from("profiles").select("full_name, phone").eq("id", context.userId).single();
    const origin = process.env["SITE_URL"] || "https://besbi.lovable.app";
    const ref = `BB-${b.id}-${balance ? "solde" : "paiement"}-${Date.now()}`;

    const res = await fetch(`${base}/api/v1/connect/transactions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${sk}`, "Content-Type": "application/json", "X-Idempotency-Key": ref },
      body: JSON.stringify({
        amount,
        beneficiary,
        application_fee: 0,
        release_policy: "on_funding",
        external_ref: ref,
        payment_method: opMap[data.method],
        initiate_charge: true,
        success_url: `${origin}/reservations?paid=1`,
        error_url: `${origin}/reservations?paid=0`,
        payer: { name: prof?.full_name || "Client Bës bi", phone: prof?.phone ? `+${prof.phone.replace(/\D/g, "").replace(/^(?!221)/, "221")}` : undefined },
        metadata: { booking_id: b.id, kind: balance ? "balance" : "deposit", method: data.method },
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { id?: string; checkout_url?: string };
    if (!res.ok || !body.checkout_url) {
      console.error("[xaalispay] statut", res.status, JSON.stringify(body).slice(0, 400));
      return { paymentUrl: null, error: "Le paiement n'a pas pu être lancé, réessayez" };
    }
    await supabaseAdmin.from("transactions").insert({
      booking_id: b.id, user_id: context.userId, provider_id: null, amount, type: "payment",
      method: data.method, status: "pending", reference: body.id ?? ref,
    });
    return { paymentUrl: body.checkout_url, error: null };
  });

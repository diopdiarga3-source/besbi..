import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { BookingCard, btn, type BookingRow } from "@/components/BookingCard";
import { MeasureDialog } from "@/components/MeasureDialog";
import { errMsg, fcfa, methodLabel } from "@/lib/format";
import { useServerFn } from "@tanstack/react-start";
import { createDepositCheckout } from "@/lib/xaalispay.functions";

export const Route = createFileRoute("/_authenticated/reservations")({
  head: () => ({ meta: [{ title: "Mes réservations — Bës bi" }, { name: "description", content: "Suivez vos réservations et paiements." }, { property: "og:title", content: "Mes réservations — Bës bi" }, { property: "og:description", content: "Vos réservations." }] }),
  component: MyBookings,
});

const TABS = [
  { k: "upcoming", l: "À venir", f: (b: BookingRow) => ["pending", "accepted"].includes(b.status) },
  { k: "done", l: "Terminées", f: (b: BookingRow) => b.status === "completed" },
  { k: "cancel", l: "Annulées", f: (b: BookingRow) => ["cancelled", "rejected"].includes(b.status) },
  { k: "pay", l: "Paiements", f: () => false },
];

function MyBookings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("upcoming");
  useEffect(() => {
    const paidParam = new URLSearchParams(window.location.search).get("paid");
    if (paidParam === "1") { toast.success("Paiement confirmé ! Votre réservation est validée 🎉"); window.history.replaceState({}, "", "/reservations"); }
    else if (paidParam === "0") { toast.error("Le paiement a été annulé ou a échoué. Vous pouvez réessayer."); window.history.replaceState({}, "", "/reservations"); }
  }, []);
  const [reviewFor, setReviewFor] = useState<BookingRow | null>(null);
  const [measureFor, setMeasureFor] = useState<BookingRow | null>(null);

  const { data } = useQuery({
    queryKey: ["my-bookings", user?.id],
    queryFn: async () => {
      const [b, r, t] = await Promise.all([
        supabase.from("bookings").select("*, services(name), providers(business_name, categories(slug))").eq("client_id", user!.id).order("date", { ascending: false }),
        supabase.from("reviews").select("booking_id").eq("client_id", user!.id),
        supabase.from("transactions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }),
      ]);
      return { bookings: (b.data ?? []) as unknown as BookingRow[], reviewed: new Set((r.data ?? []).map((x) => x.booking_id)), tx: t.data ?? [] };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["my-bookings"] });

  async function cancel(id: string) {
    if (!confirm("Annuler cette réservation ? Les sommes versées seront remboursées.")) return;
    const { error } = await supabase.rpc("set_booking_status", { _booking: id, _status: "cancelled" });
    if (error) toast.error(errMsg(error)); else { toast.success("Réservation annulée"); refresh(); }
  }
  const createChargeFn = useServerFn(createDepositCheckout);
  async function payRest(id: string) {
    try {
      const charge = await createChargeFn({ data: { bookingId: id, method: "wave" } });
      if (charge.error) throw new Error(charge.error);
      if (!charge.paymentUrl) throw new Error("Paiement en ligne indisponible pour le moment");
      window.location.href = charge.paymentUrl;
    } catch (e) { toast.error(errMsg(e)); }
  }
  const [locating, setLocating] = useState<string | null>(null);
  function shareGps(id: string) {
    if (!navigator.geolocation) { toast.error("La localisation n'est pas disponible sur cet appareil"); return; }
    setLocating(id);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { error } = await supabase.rpc("share_booking_location", { _booking: id, _lat: pos.coords.latitude, _lng: pos.coords.longitude });
        setLocating(null);
        if (error) toast.error(errMsg(error)); else { toast.success("Position GPS partagée avec le prestataire"); refresh(); }
      },
      () => { setLocating(null); toast.error("Autorisez la localisation dans votre navigateur pour partager votre position"); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  const current = TABS.find((t) => t.k === tab)!;
  const list = (data?.bookings ?? []).filter(current.f);
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader title="Mes réservations" />
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((t) => <button key={t.k} onClick={() => setTab(t.k)} className={`${btn} whitespace-nowrap ${tab === t.k ? "bg-ink text-ink-foreground" : "bg-muted"}`}>{t.l}</button>)}
      </div>

      {tab === "pay" ? (
        <div className="overflow-hidden rounded-2xl border bg-card">
          {(data?.tx ?? []).map((t) => (
            <div key={t.id} className="flex items-center justify-between border-b p-4 text-sm last:border-0">
              <div><b>{t.type === "refund" ? "Remboursement" : "Paiement"}</b> · {methodLabel[t.method] ?? t.method}<p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString("fr-FR")} · Réf. {t.reference}</p></div>
              <span className={`font-bold ${t.amount < 0 ? "text-success" : ""}`}>{fcfa(t.amount)}</span>
            </div>
          ))}
          {!data?.tx.length && <p className="p-8 text-center text-muted-foreground">Aucun paiement.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((b) => (
            <BookingCard key={b.id} b={b} title={b.providers?.business_name ?? ""}>
              <Link to="/messages/$bookingId" params={{ bookingId: b.id }} className={`${btn} bg-muted`}>Message</Link>
              {["pending", "accepted"].includes(b.status) && (
                <button onClick={() => shareGps(b.id)} disabled={locating === b.id} className={`${btn} border`}>
                  {locating === b.id ? "Localisation..." : b.location_lat != null ? "📍 Mettre à jour ma position" : "📍 Partager ma position GPS"}
                </button>
              )}
              {["pending", "accepted"].includes(b.status) && (b.providers as { categories?: { slug: string } | null } | null)?.categories?.slug === "tailleur" && (
                <button onClick={() => setMeasureFor(b)} className={`${btn} bg-primary text-primary-foreground`}>{b.measurements ? "🧵 Modifier mes mesures" : "🧵 Mes mesures par photo"}</button>
              )}
              {b.payment_status === "unpaid" && ["pending", "accepted"].includes(b.status) && <button onClick={() => payRest(b.id)} className={`${btn} bg-primary text-primary-foreground`}>Payer</button>}
              {b.status === "accepted" && <button onClick={async () => {
                if (!confirm("Confirmez-vous que le service a bien été réalisé ?")) return;
                const { error } = await supabase.rpc("set_booking_status", { _booking: b.id, _status: "completed" });
                if (error) toast.error(errMsg(error)); else { toast.success("Merci ! Prestation terminée"); refresh(); setReviewFor(b); }
              }} className={`${btn} bg-ink text-ink-foreground`}>Prestation terminée</button>}
              {["pending", "accepted"].includes(b.status) && <button onClick={() => cancel(b.id)} className={`${btn} border text-destructive`}>Annuler</button>}
              {b.status === "completed" && !data?.reviewed.has(b.id) && <button onClick={() => setReviewFor(b)} className={`${btn} bg-primary text-primary-foreground`}>Laisser un avis</button>}
              <Link to="/prestataire/$id" params={{ id: b.provider_id }} className={`${btn} ml-auto underline`}>Prestataire</Link>
            </BookingCard>
          ))}
          {list.length === 0 && <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Rien ici pour le moment. <Link to="/recherche" className="font-bold underline">Trouver un prestataire</Link></p>}
        </div>
      )}
      {measureFor && <MeasureDialog b={measureFor} onClose={() => { setMeasureFor(null); void refresh(); }} />}
      {reviewFor && <ReviewDialog b={reviewFor} onClose={() => { setReviewFor(null); refresh(); }} />}
    </div>
  );
}

function ReviewDialog({ b, onClose }: { b: BookingRow; onClose: () => void }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  async function send() {
    const { error } = await supabase.from("reviews").insert({ booking_id: b.id, provider_id: b.provider_id, client_id: user!.id, rating, comment: comment.trim().slice(0, 1000) });
    if (error) toast.error(errMsg(error)); else { toast.success("Merci pour votre avis !"); onClose(); }
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-extrabold">Votre avis</h2>
        <div className="my-4 flex gap-1">{[1, 2, 3, 4, 5].map((i) => <button key={i} onClick={() => setRating(i)}><Star className={`h-8 w-8 ${i <= rating ? "fill-primary text-primary" : "text-muted"}`} /></button>)}</div>
        <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} placeholder="Racontez votre expérience..." className="w-full rounded-xl border p-3" />
        <button onClick={send} className="mt-4 w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground">Publier</button>
      </div>
    </div>
  );
}

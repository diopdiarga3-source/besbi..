import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Calendar } from "@/components/ui/calendar";
import { fcfa, unitLabel, errMsg, depositOf, isDayOnly } from "@/lib/format";
import { useServerFn } from "@tanstack/react-start";
import { createDepositCheckout } from "@/lib/xaalispay.functions";
import { MeasureForm, type MeasureValue } from "@/components/MeasureDialog";
import { questionsForCategory } from "@/lib/category-questions";
import { EVENT_TYPES, asOptions, asEventPrices, asZones, computePrice } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/reserver/$serviceId")({
  head: () => ({ meta: [{ title: "Réserver — Bës bi" }, { name: "description", content: "Choisissez date, créneau et payez." }, { property: "og:title", content: "Réserver — Bës bi" }, { property: "og:description", content: "Réservation de prestation." }] }),
  component: BookPage,
});

function slotsFor(avail: { start_time: string; end_time: string }[], stepMin: number) {
  const out: string[] = [];
  const step = Math.min(Math.max(stepMin, 60), 240);
  for (const a of avail) {
    const [sh, sm] = a.start_time.split(":").map(Number);
    const [eh, em] = a.end_time.split(":").map(Number);
    for (let t = sh! * 60 + sm!; t + 60 <= eh! * 60 + em!; t += step)
      out.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return out;
}

function BookPage() {
  const { serviceId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const createChargeFn = useServerFn(createDepositCheckout);
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string>();
  const [qty, setQty] = useState(1);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState("wave");
  const deposit = true;
  const [busy, setBusy] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [measures, setMeasures] = useState<MeasureValue | null>(null);
  const [neededBy, setNeededBy] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const setAnswer = (k: string, v: string) => setAnswers((a) => ({ ...a, [k]: v }));
  const [locating, setLocating] = useState(false);
  const [direct, setDirect] = useState<string | null>(null);
  const [ref, setRef] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [eventType, setEventType] = useState("");
  const [guests, setGuests] = useState(0);
  const [city, setCity] = useState("");
  function openWave(phone: string) {
    void navigator.clipboard.writeText(phone).catch(() => null);
    toast.success("Numéro copié — collez-le dans Wave");
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) {
      window.location.href = "intent:#Intent;package=com.wave.personal;action=android.intent.action.MAIN;category=android.intent.category.LAUNCHER;end";
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      window.location.href = "wave://";
      window.setTimeout(() => { window.open("https://pay.wave.com/", "_blank"); }, 1500);
    } else {
      window.open("https://pay.wave.com/", "_blank");
    }
  }
  function locate() {
    if (!navigator.geolocation) { toast.error("La localisation n'est pas disponible sur cet appareil"); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); toast.success("Position enregistrée"); },
      () => { setLocating(false); toast.error("Autorisez la localisation dans votre navigateur"); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  const { data } = useQuery({
    queryKey: ["book", serviceId],
    queryFn: async () => {
      const { data: s } = await supabase.from("services").select("*, providers(*, categories(slug))").eq("id", serviceId).single();
      const [a, b, st] = await Promise.all([
        supabase.from("availability").select("*").eq("provider_id", s!.provider_id),
        supabase.from("blocked_dates").select("date").eq("provider_id", s!.provider_id),
        supabase.from("settings").select("*"),
      ]);
      return { s: s!, avail: a.data ?? [], blocked: (b.data ?? []).map((x) => x.date), settings: Object.fromEntries((st.data ?? []).map((x) => [x.key, Number(x.value)])) };
    },
  });

  const dateStr = date ? format(date, "yyyy-MM-dd") : undefined;
  const { data: taken = [] } = useQuery({
    queryKey: ["taken", data?.s.provider_id, dateStr],
    enabled: !!data && !!dateStr,
    queryFn: async () => {
      const { data: r } = await supabase.rpc("taken_slots", { _provider: data!.s.provider_id, _date: dateStr! });
      return ((r as unknown as { start_time: string }[]) ?? []).map((x) => x.start_time.slice(0, 5));
    },
  });

  const slots = useMemo(() => (data && date ? slotsFor(data.avail.filter((a) => a.weekday === date.getDay()), data.s.duration_minutes) : []), [data, date]);

  if (!data) return <div className="p-10 text-center text-muted-foreground">Chargement...</div>;
  const { s, avail, blocked, settings } = data;
  const p = s.providers!;
  const isTailor = (p as unknown as { categories?: { slug: string } | null }).categories?.slug === "tailleur";
  const catSlug = (p as unknown as { categories?: { slug: string } | null }).categories?.slug ?? null;
  const catQuestions = questionsForCategory(catSlug);
  const dayOnly = isDayOnly(catSlug) && !isTailor;
  const qtyEnabled = s.unit !== "forfait";
  const svcOptions = asOptions(s.options);
  const eventPrices = asEventPrices(s.event_prices);
  const zones = asZones(p.travel_zones);
  const price = computePrice(s, p, { quantity: qtyEnabled ? qty : 1, selected: picked, eventType: eventType || null, guests, city });
  const subtotal = price.subtotal;
  const travel = price.travel;
  const fee = Math.round((subtotal * (settings['client_fee_rate'] ?? 0)) / 100);
  const total = subtotal + travel + fee;

  async function confirm(): Promise<void> {
    if (isTailor ? !neededBy : !date || (!dayOnly && !time)) { toast.error(isTailor ? "Indiquez la date de livraison souhaitée" : dayOnly ? "Choisissez une date" : "Choisissez une date et un créneau"); return; }
    if (location.trim().length < 2) { toast.error("Indiquez le lieu de la prestation"); return; }
    setBusy(true);
    try {
      const { data: b, error } = await supabase.from("bookings").insert({
        client_id: user!.id, provider_id: s.provider_id, service_id: s.id, date: isTailor ? neededBy : dateStr!, start_time: isTailor || dayOnly ? "00:00" : time!,
        quantity: qtyEnabled ? qty : 1, location: location.trim().slice(0, 200), notes: notes.trim().slice(0, 1000),
        location_lat: coords?.lat ?? null, location_lng: coords?.lng ?? null,
        measurements: isTailor && measures ? { ...measures.measures, taille: measures.taille, genre: measures.genre } : null,
        needed_by: isTailor && neededBy ? neededBy : null,
        requirements: Object.values(answers).some((v) => v.trim() !== "") ? answers : null,
        selected_options: picked, event_type: eventType || null, guests, client_city: city.trim().slice(0, 60) || null,
      }).select("id").single();
      if (error) throw error.code === "23505" ? new Error("Ce créneau vient d'être réservé, choisissez-en un autre") : error;
      const charge = await createChargeFn({ data: { bookingId: b.id, method: method as "wave" | "orange_money" } });
      if (charge.error) throw new Error(charge.error);
      if (charge.paymentUrl) {
        toast.success("Redirection vers le paiement sécurisé...");
        window.location.href = charge.paymentUrl;
        return;
      }
      // Plus de paiement simulé : le statut « payé » n'est posé que par le serveur (webhook).
      toast.error("Paiement en ligne indisponible. Votre demande est enregistrée, réglez depuis « Mes réservations ».");
      void navigate({ to: "/reservations" });
    } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }

  const openDays = new Set(avail.map((a) => a.weekday));
  if (direct && p.payout_phone && false) {
    const phone = p.payout_phone ?? "";
    const amount = depositOf(total);
    const pretty = phone.replace(/^(\d{2})(\d{3})(\d{2})(\d{2})$/, "$1 $2 $3 $4");
    const payName = (p as unknown as { payout_name?: string | null }).payout_name ?? p.business_name;
    async function declare(): Promise<void> {
      if (ref.trim().length < 4) { toast.error("Indiquez la référence reçue par SMS"); return; }
      setBusy(true);
      try {
        const { error } = await supabase.rpc("declare_direct_payment" as never, { _booking: direct, _method: method === "card" ? "wave" : method, _deposit: deposit, _reference: ref.trim() } as never);
        if (error) throw error;
        toast.success("Paiement signalé au prestataire 🎉");
        void navigate({ to: "/reservations" });
      } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
    }
    return (
      <div className="mx-auto max-w-lg space-y-4 px-4 py-8">
        <h1 className="text-2xl font-extrabold">Payer {fcfa(amount)}</h1>
        <p className="text-sm text-muted-foreground">Envoyez le montant directement au prestataire, puis confirmez ci-dessous.</p>
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Bénéficiaire</p>
          <p className="text-lg font-bold">{payName}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-wide">{pretty}</p>
          <p className="mt-1 text-sm">Montant : <b>{fcfa(amount)}</b></p>
          <div className="mt-4 grid gap-2">
            <button type="button" onClick={() => openWave(phone)} className="rounded-xl bg-primary py-3 text-center font-bold text-primary-foreground">Ouvrir Wave</button>
            <a href={`tel:${encodeURIComponent(`#144#`)}`} className="rounded-xl border-2 py-3 text-center font-bold">Orange Money (#144#)</a>
            <button type="button" onClick={() => { void navigator.clipboard.writeText(phone).then(() => toast.success("Numéro copié")); }} className="rounded-xl border-2 py-3 font-bold">Copier le numéro</button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Le numéro est copié automatiquement : dans Wave, touchez « Envoyer », collez-le et saisissez le montant.</p>
        </div>
        <label className="block text-sm font-semibold">Référence de la transaction (SMS de confirmation)
          <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Ex : T2409XXXXX" className="mt-1 w-full rounded-xl border px-4 py-2.5" />
        </label>
        <button disabled={busy} onClick={() => void declare()} className="w-full rounded-xl bg-ink py-3.5 font-bold text-ink-foreground disabled:opacity-60">{busy ? "..." : "J'ai envoyé le paiement"}</button>
        <p className="text-xs text-muted-foreground">Bës bi ne prend aucune commission : 100 % du montant va au prestataire.</p>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <p className="text-sm font-semibold text-muted-foreground">{p.business_name}</p>
      <h1 className="text-3xl font-extrabold">{s.name}</h1>
      <p className="mt-1">{fcfa(s.price)} <span className="text-muted-foreground">{unitLabel[s.unit]}</span></p>

      <div className="mt-8 grid gap-8 md:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {!isTailor && (
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 font-bold">1. Date</h2>
            <Calendar mode="single" locale={fr} selected={date} onSelect={(d) => { setDate(d); setTime(undefined); }}
              disabled={(d) => d < addDays(new Date(), 0) || !openDays.has(d.getDay()) || blocked.includes(format(d, "yyyy-MM-dd"))} />
          </section>
          )}
          {date && !isTailor && !dayOnly && (
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="mb-3 font-bold">2. Heure — {format(date, "EEEE d MMMM", { locale: fr })}</h2>
              <div className="flex flex-wrap gap-2">
                {slots.map((t) => {
                  const off = taken.includes(t);
                  return <button key={t} disabled={off} onClick={() => setTime(t)}
                    className={`rounded-xl border px-4 py-2 text-sm font-bold ${time === t ? "border-ink bg-ink text-ink-foreground" : ""} ${off ? "cursor-not-allowed line-through opacity-40" : "hover:border-primary"}`}>{t}</button>;
                })}
                {slots.length === 0 && <p className="text-sm text-muted-foreground">Aucun créneau ce jour.</p>}
              </div>
            </section>
          )}
          <section className="space-y-3 rounded-2xl border bg-card p-5">
            <h2 className="font-bold">3. Détails</h2>
            {qtyEnabled && (
              <label className="block text-sm font-semibold">Quantité {s.unit === "jour" ? "(jours)" : s.unit === "heure" ? "(heures)" : ""}
                <input type="number" min={1} max={10000} value={qty} onChange={(e) => setQty(Math.max(1, +e.target.value || 1))} className="mt-1 w-full rounded-xl border px-4 py-2.5" />
              </label>
            )}
            <label className="block text-sm font-semibold">Lieu de la prestation
              <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex : Diourbel, quartier Keur Goumak" className="mt-1 w-full rounded-xl border px-4 py-2.5" />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={locate} disabled={locating} className="rounded-xl border-2 border-primary px-4 py-2 text-sm font-bold disabled:opacity-60">
                {locating ? "Localisation..." : coords ? "📍 Position mise à jour" : "📍 Utiliser ma position exacte"}
              </button>
              {coords && <>
                <a href={`https://www.google.com/maps?q=${coords.lat},${coords.lng}`} target="_blank" rel="noreferrer" className="text-sm font-semibold underline">Vérifier sur la carte</a>
                <button type="button" onClick={() => setCoords(null)} className="text-sm text-muted-foreground underline">Retirer</button>
              </>}
            </div>
            <label className="block text-sm font-semibold">Informations complémentaires
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1 w-full rounded-xl border px-4 py-2.5" />
            </label>
          </section>
          {catQuestions.length > 0 && (
            <section className="space-y-3 rounded-2xl border bg-card p-5">
              <h2 className="font-bold">✨ Vos attentes</h2>
              <p className="text-xs text-muted-foreground">Ces précisions aident le prestataire à préparer exactement ce que vous voulez.</p>
              {catQuestions.map((q) => (
                <label key={q.key} className="block text-sm font-semibold">{q.label}
                  {q.type === "select" ? (
                    <select value={answers[q.key] ?? ""} onChange={(e) => setAnswer(q.key, e.target.value)} className="mt-1 w-full rounded-xl border bg-card px-4 py-2.5">
                      <option value="">Choisir…</option>
                      {q.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={q.type === "number" ? "number" : "text"} min={q.type === "number" ? 1 : undefined} value={answers[q.key] ?? ""} onChange={(e) => setAnswer(q.key, e.target.value)} placeholder={q.placeholder} className="mt-1 w-full rounded-xl border px-4 py-2.5" />
                  )}
                </label>
              ))}
            </section>
          )}
          {isTailor && (
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="font-bold">👗 Date de livraison souhaitée</h2>
              <p className="mt-1 text-xs text-muted-foreground">Pour quel jour avez-vous besoin de votre habit ? Le tailleur s'organisera en conséquence.</p>
              <input type="date" value={neededBy} min={format(new Date(), "yyyy-MM-dd")} onChange={(e) => setNeededBy(e.target.value)} className="mt-2 w-full rounded-xl border px-4 py-2.5" />
            </section>
          )}
          {isTailor && (
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="font-bold">🧵 Vos mesures <span className="text-xs font-normal text-muted-foreground">(facultatif, modifiable ensuite)</span></h2>
              <div className="mt-3"><MeasureForm onChange={setMeasures} /></div>
            </section>
          )}
          <section className="space-y-3 rounded-2xl border bg-card p-5">
            <h2 className="font-bold">💰 Votre événement</h2>
            <label className="block text-sm font-semibold">Type d'événement
              <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="mt-1 w-full rounded-xl border bg-card px-4 py-2.5">
                <option value="">Choisir…</option>
                {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}{eventPrices[t] ? ` (+${fcfa(eventPrices[t])})` : ""}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">Nombre d'invités{s.guest_price > 0 ? ` (${s.guests_included} inclus, +${fcfa(s.guest_price)} par invité en plus)` : ""}
              <input type="number" min={0} value={guests || ""} onChange={(e) => setGuests(Math.max(0, +e.target.value || 0))} className="mt-1 w-full rounded-xl border px-4 py-2.5" />
            </label>
            {p.travel_possible && (
              <label className="block text-sm font-semibold">Votre ville (frais de déplacement)
                <input list="zones" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex : Thiès" className="mt-1 w-full rounded-xl border px-4 py-2.5" />
                <datalist id="zones">{zones.map((z) => <option key={z.city} value={z.city} />)}</datalist>
              </label>
            )}
            {svcOptions.length > 0 && (
              <div className="space-y-1 text-sm">
                <p className="font-semibold">Options supplémentaires</p>
                {svcOptions.map((o) => (
                  <label key={o.label} className="flex items-center gap-2">
                    <input type="checkbox" checked={picked.includes(o.label)} onChange={(e) => setPicked(e.target.checked ? [...picked, o.label] : picked.filter((x) => x !== o.label))} />
                    {o.label} <span className="text-muted-foreground">+{fcfa(o.price)}</span>
                  </label>
                ))}
              </div>
            )}
          </section>
          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 font-bold">4. Paiement</h2>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries({ wave: "Wave", orange_money: "Orange Money" }).map(([k, l]) => (
                <button key={k} onClick={() => setMethod(k)} className={`rounded-xl border-2 p-3 text-sm font-bold ${method === k ? "border-primary bg-accent" : ""}`}>{l}</button>
              ))}
            </div>
            <p className="mt-4 rounded-xl bg-accent p-3 text-sm font-semibold">Montant total à payer maintenant : {fcfa(total)}. Le prestataire est payé après la prestation.</p>
          </section>
        </div>

        <aside className="h-fit rounded-2xl bg-ink p-6 text-ink-foreground md:sticky md:top-24">
          <h2 className="mb-4 text-lg font-bold text-primary">Récapitulatif</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt>Prix du service{qtyEnabled ? ` × ${qty}` : ""}</dt><dd>{fcfa(price.base)}</dd></div>
            {price.options > 0 && <div className="flex justify-between"><dt>Options</dt><dd>{fcfa(price.options)}</dd></div>}
            {price.event > 0 && <div className="flex justify-between"><dt>{eventType}</dt><dd>{fcfa(price.event)}</dd></div>}
            {price.guestFee > 0 && <div className="flex justify-between"><dt>Invités supplémentaires</dt><dd>{fcfa(price.guestFee)}</dd></div>}
            <div className="flex justify-between"><dt>Frais de déplacement</dt><dd>{fcfa(travel)}</dd></div>
            <div className="flex justify-between border-t border-ink-foreground/20 pt-3 text-lg font-extrabold"><dt>Total</dt><dd className="text-primary">{fcfa(total)}</dd></div>
          </dl>
          <button disabled={busy} onClick={confirm} className="mt-6 w-full rounded-xl bg-primary py-3.5 font-bold text-primary-foreground disabled:opacity-60">
            {busy ? "..." : `Payer ${fcfa(total)}`}
          </button>
          <p className="mt-3 text-xs opacity-70">Le prestataire confirme votre demande. En cas de refus, vous êtes remboursé automatiquement.</p>
        </aside>
      </div>
    </div>
  );
}

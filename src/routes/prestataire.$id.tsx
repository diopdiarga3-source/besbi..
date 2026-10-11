import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Heart, MapPin, MessageCircle, Star, Flag, Truck, Car } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { fcfa, unitLabel, errMsg } from "@/lib/format";

export const Route = createFileRoute("/prestataire/$id")({
  head: () => ({
    meta: [
      { title: "Profil prestataire — Bës bi" },
      { name: "description", content: "Services, tarifs, réalisations, disponibilités et avis clients." },
      { property: "og:title", content: "Profil prestataire — Bës bi" },
      { property: "og:description", content: "Découvrez ce prestataire et réservez en ligne." },
    ],
  }),
  component: ProviderPage,
});

const DAYS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function ProviderPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["provider", id],
    queryFn: async () => {
      const [p, s, a, r] = await Promise.all([
        supabase.from("providers").select("*, categories(name,emoji)").eq("id", id).maybeSingle(),
        supabase.from("services").select("*").eq("provider_id", id).eq("active", true).order("price"),
        supabase.from("availability").select("*").eq("provider_id", id).order("weekday"),
        supabase.from("reviews").select("*").eq("provider_id", id).order("created_at", { ascending: false }),
      ]);
      return { p: p.data, services: s.data ?? [], avail: a.data ?? [], reviews: r.data ?? [] };
    },
  });
  const { data: fav } = useQuery({
    queryKey: ["fav", id, user?.id],
    enabled: !!user,
    queryFn: async () => !!(await supabase.from("favorites").select("provider_id").eq("provider_id", id).maybeSingle()).data,
  });

  async function toggleFav() {
    if (!user) return navigate({ to: "/auth" });
    const res = fav
      ? await supabase.from("favorites").delete().eq("provider_id", id).eq("user_id", user.id)
      : await supabase.from("favorites").insert({ provider_id: id, user_id: user.id });
    if (res.error) return toast.error(errMsg(res.error));
    qc.invalidateQueries({ queryKey: ["fav", id] });
  }

  if (isLoading) return <div className="p-10 text-center text-muted-foreground">Chargement...</div>;
  if (!data?.p) return <div className="p-10 text-center">Prestataire introuvable.</div>;
  const { p, services, avail, reviews } = data;

  return (
    <div>
      <div className="relative h-56 bg-ink md:h-80">
        {p.cover_url && <img src={p.cover_url} alt="" className="h-full w-full object-cover opacity-80" />}
      </div>
      <div className="mx-auto -mt-16 max-w-6xl px-4 pb-16">
        <div className="relative rounded-3xl border bg-card p-6 shadow-sm md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-muted-foreground">{p.categories?.emoji} {p.categories?.name}</p>
              <h1 className="mt-1 flex items-center gap-2 text-3xl font-extrabold md:text-4xl">
                {p.business_name}{p.verified && <BadgeCheck className="h-7 w-7 fill-primary text-ink" />}
              </h1>
              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{p.city}</span>
                <span className="flex items-center gap-1 font-bold"><Star className="h-4 w-4 fill-primary text-primary" />{Number(p.rating_avg).toFixed(1)} ({p.reviews_count} avis)</span>
                <span>{p.completed_count} prestations réalisées</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={toggleFav} aria-label="Favori" className="rounded-full border-2 p-3"><Heart className={`h-5 w-5 ${fav ? "fill-primary text-primary" : ""}`} /></button>
              <button
                onClick={(): void => {
                  if (!user) { void navigate({ to: "/auth" }); return; }
                  if (services.length === 1) { void navigate({ to: "/reserver/$serviceId", params: { serviceId: services[0]!.id } }); return; }
                  if (services.length === 0) { toast.info("Aucun service disponible pour le moment"); return; }
                  document.getElementById("services")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  toast("Choisissez le service à réserver");
                }}
                className="rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">Réserver</button>
            </div>
          </div>
          <p className="mt-5 max-w-3xl text-muted-foreground">{p.description}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-full bg-muted px-3 py-1">Zone : {p.zone || p.city}</span>
            {p.travel_possible && <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1"><Car className="h-3.5 w-3.5" />Déplacement {p.travel_fee ? `(${fcfa(p.travel_fee)})` : "offert"}</span>}
            {p.delivery_available && <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1"><Truck className="h-3.5 w-3.5" />Livraison</span>}
          </div>
        </div>

        {p.portfolio?.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-2xl font-extrabold">Mes réalisations</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {p.portfolio.map((u: string, i: number) => <img key={i} src={u} alt="" loading="lazy" className="aspect-square w-full rounded-2xl object-cover" />)}
            </div>
          </section>
        )}

        <div className="mt-10 grid gap-8 md:grid-cols-[1fr_320px]">
          <section id="services">
            <h2 className="mb-4 text-2xl font-extrabold">Services & tarifs</h2>
            <div className="space-y-3">
              {services.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-5">
                  <div>
                    <h3 className="font-bold">{s.name}</h3>
                    {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                    <p className="mt-1 text-sm"><b>{fcfa(s.price)}</b> <span className="text-muted-foreground">{unitLabel[s.unit]}</span></p>
                  </div>
                  <Link to="/reserver/$serviceId" params={{ serviceId: s.id }} className="rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-ink-foreground">Réserver</Link>
                </div>
              ))}
              {services.length === 0 && <p className="text-muted-foreground">Aucun service publié pour le moment.</p>}
            </div>

            <h2 className="mb-4 mt-10 text-2xl font-extrabold">Avis clients</h2>
            <ReviewForm providerId={id} onDone={() => qc.invalidateQueries({ queryKey: ["provider", id] })} />
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-2xl border bg-card p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex">{Array.from({ length: 5 }).map((_, i) => <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-primary text-primary" : "text-muted"}`} />)}</span>
                    {user && !r.reported && (
                      <button onClick={async () => { await supabase.rpc("report_review", { _review: r.id }); toast.success("Avis signalé"); }} className="flex items-center gap-1 text-xs text-muted-foreground"><Flag className="h-3 w-3" />Signaler</button>
                    )}
                  </div>
                  <p className="mt-2 text-sm">{r.comment}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</p>
                </div>
              ))}
              {reviews.length === 0 && <p className="text-muted-foreground">Pas encore d'avis.</p>}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl bg-ink p-5 text-ink-foreground">
              <h3 className="mb-3 font-bold text-primary">Horaires</h3>
              <ul className="space-y-1 text-sm">
                {DAYS.map((d, i) => {
                  const a = avail.filter((x) => x.weekday === i);
                  return <li key={d} className="flex justify-between"><span>{d}</span><span className="opacity-80">{a.length ? a.map((x) => `${x.start_time.slice(0, 5)}–${x.end_time.slice(0, 5)}`).join(", ") : "Fermé"}</span></li>;
                })}
              </ul>
            </div>
            <div className="rounded-2xl border bg-card p-5 text-sm">
              <MessageCircle className="mb-2 h-5 w-5" />
              La messagerie avec le prestataire s'ouvre dès votre première réservation.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function ReviewForm({ providerId, onDone }: { providerId: string; onDone: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: eligible } = useQuery({
    queryKey: ["review-eligible", providerId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [b, r] = await Promise.all([
        supabase.from("bookings").select("id").eq("client_id", user!.id).eq("provider_id", providerId).eq("status", "completed"),
        supabase.from("reviews").select("booking_id").eq("client_id", user!.id).eq("provider_id", providerId),
      ]);
      const done = new Set((r.data ?? []).map((x) => x.booking_id));
      return (b.data ?? []).find((x) => !done.has(x.id))?.id ?? null;
    },
  });
  if (!user) return <p className="mb-4 rounded-2xl border border-dashed p-4 text-sm text-muted-foreground"><Link to="/auth" className="font-bold underline">Connectez-vous</Link> pour donner votre avis après une prestation.</p>;
  if (!eligible) return <p className="mb-4 text-sm text-muted-foreground">Vous pourrez noter ce prestataire une fois votre prestation terminée.</p>;
  async function send() {
    setBusy(true);
    const { error } = await supabase.from("reviews").insert({ booking_id: eligible!, provider_id: providerId, client_id: user!.id, rating, comment: comment.trim().slice(0, 1000) });
    setBusy(false);
    if (error) { toast.error(errMsg(error)); return; }
    toast.success("Merci pour votre avis !");
    setComment("");
    qc.invalidateQueries({ queryKey: ["review-eligible", providerId] });
    onDone();
  }
  return (
    <div className="mb-4 rounded-2xl border-2 border-primary bg-card p-5">
      <h3 className="font-bold">Notez votre prestation</h3>
      <div className="my-3 flex gap-1">{[1, 2, 3, 4, 5].map((i) => <button key={i} onClick={() => setRating(i)} aria-label={`${i} étoiles`}><Star className={`h-8 w-8 ${i <= rating ? "fill-primary text-primary" : "text-muted"}`} /></button>)}</div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000} placeholder="Racontez votre expérience..." className="w-full rounded-xl border p-3 text-sm" />
      <button onClick={send} disabled={busy} className="mt-3 rounded-full bg-primary px-6 py-2.5 font-bold text-primary-foreground">{busy ? "Envoi..." : "Publier mon avis"}</button>
    </div>
  );
}

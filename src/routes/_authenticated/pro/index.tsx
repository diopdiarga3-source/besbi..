import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Wallet, ClipboardList, CalendarCheck, Users, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMyProvider, useProBookings } from "@/lib/pro";
import { PageHeader } from "@/components/AppShell";
import { fcfa, statusLabel, statusTone } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pro/")({
  head: () => ({ meta: [{ title: "Tableau de bord — Bës bi Pro" }, { name: "description", content: "Votre activité en un coup d'œil." }, { property: "og:title", content: "Dashboard — Bës bi Pro" }, { property: "og:description", content: "Dashboard." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data: p } = useMyProvider();
  const { data: bookings = [] } = useProBookings();
  const { data: tx = [] } = useQuery({
    queryKey: ["pro-tx", user?.id],
    queryFn: async () => (await supabase.from("transactions").select("*").eq("provider_id", user!.id).order("created_at", { ascending: false })).data ?? [],
  });
  const month = new Date().toISOString().slice(0, 7);
  const monthDone = bookings.filter((b) => b.status === "completed" && b.date.startsWith(month));
  const revenue = monthDone.reduce((s, b) => s + b.provider_amount, 0);
  const pending = bookings.filter((b) => b.status === "pending");
  const upcoming = bookings.filter((b) => b.status === "accepted" && b.date >= new Date().toISOString().slice(0, 10));
  const earned = bookings.filter((b) => b.status === "completed").reduce((s, b) => s + b.provider_amount, 0);

  const kpis = [
    { l: "Revenus du mois", v: fcfa(revenue), i: Wallet },
    { l: "Nouvelles commandes", v: pending.length, i: ClipboardList },
    { l: "Réservations à venir", v: upcoming.length, i: CalendarCheck },
    { l: "Clients", v: new Set(bookings.map((b) => b.client_id)).size, i: Users },
    { l: "Note moyenne", v: Number(p?.rating_avg ?? 0).toFixed(1), i: Star },
  ];
  return (
    <div>
      <PageHeader title={`Bonjour, ${p?.business_name ?? ""}`} subtitle={p?.verified ? "✅ Profil vérifié" : "⏳ Vérification en attente par l'équipe Bës bi"}
        action={<Link to="/pro/profil" className="rounded-full border-2 border-ink px-4 py-2 text-sm font-bold">Modifier mon profil</Link>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map((k, idx) => (
          <div key={k.l} className={`rounded-2xl p-4 ${idx === 0 ? "col-span-2 bg-ink text-ink-foreground md:col-span-1" : "border bg-card"}`}>
            <k.i className={`h-5 w-5 ${idx === 0 ? "text-primary" : ""}`} />
            <p className="mt-3 text-2xl font-extrabold">{k.v}</p>
            <p className="text-xs opacity-70">{k.l}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex justify-between"><h2 className="font-bold">Prochaines commandes</h2><Link to="/pro/commandes" className="text-sm underline">Tout voir</Link></div>
          {[...pending, ...upcoming].slice(0, 6).map((b) => (
            <div key={b.id} className="flex items-center justify-between border-b py-2.5 text-sm last:border-0">
              <span><b>{new Date(b.date).toLocaleDateString("fr-FR")}</b> {b.start_time.slice(0, 5)} · {b.services?.name}<br /><span className="text-muted-foreground">{b.client?.full_name}</span></span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${statusTone[b.status]}`}>{statusLabel[b.status]}</span>
            </div>
          ))}
          {pending.length + upcoming.length === 0 && <p className="text-sm text-muted-foreground">Rien de prévu.</p>}
        </section>
        <section className="rounded-2xl border bg-card p-5">
          <h2 className="mb-1 font-bold">Revenus</h2>
          <p className="text-sm text-muted-foreground">Net après commission, prestations terminées</p>
          <p className="my-3 text-3xl font-extrabold">{fcfa(earned)}</p>
          <h3 className="mb-2 mt-4 text-sm font-bold">Derniers paiements clients</h3>
          {tx.slice(0, 5).map((t) => (
            <div key={t.id} className="flex justify-between py-1 text-sm"><span>{t.type === "refund" ? "Remboursement" : "Paiement"} · {new Date(t.created_at).toLocaleDateString("fr-FR")}</span><b>{fcfa(t.amount)}</b></div>
          ))}
          <p className="mt-4 rounded-xl bg-accent p-3 text-xs">Retraits et « Mon Épargne » arrivent bientôt, via un partenaire financier agréé.</p>
        </section>
      </div>
    </div>
  );
}

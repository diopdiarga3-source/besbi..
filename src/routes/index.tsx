import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ShieldCheck, Wallet, CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProviderCard, providerSelect, type ProviderRow } from "@/components/ProviderCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bës bi — Réservez vos prestataires d'événements au Sénégal" },
      { name: "description", content: "Maquillage, photo, traiteur, DJ, chaises, bâches : comparez, réservez et payez vos prestataires de mariage et fêtes." },
      { property: "og:title", content: "Bës bi — Prestataires d'événements au Sénégal" },
      { property: "og:description", content: "Comparez, réservez et payez vos prestataires en quelques minutes." },
    ],
  }),
  component: Index,
});

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await supabase.from("categories").select("*").order("sort")).data ?? [],
  });
}

function Index() {
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { data: cats = [] } = useCategories();
  const { data: providers = [] } = useQuery({
    queryKey: ["providers", "top"],
    queryFn: async () =>
      ((await supabase.from("providers").select(providerSelect).order("rating_avg", { ascending: false }).limit(6)).data ?? []) as unknown as ProviderRow[],
  });

  return (
    <div>

      <section className="bg-ink text-ink-foreground">
        <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
          <p className="mb-4 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">Mariages · Baptêmes · Shootings · Fêtes</p>
          <h1 className="max-w-3xl text-4xl font-extrabold leading-[1.05] md:text-6xl">
            Que recherchez-vous pour <span className="text-primary">votre événement</span> ?
          </h1>
          <form onSubmit={(e) => { e.preventDefault(); navigate({ to: "/recherche", search: { q } }); }}
            className="mt-8 flex max-w-2xl gap-2 rounded-2xl bg-card p-2">
            <div className="flex flex-1 items-center gap-2 px-3 text-foreground">
              <Search className="h-5 w-5 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Maquilleur, photographe, bâche, chaises..."
                className="w-full bg-transparent py-3 outline-none placeholder:text-muted-foreground" />
            </div>
            <button className="rounded-xl bg-primary px-5 font-bold text-primary-foreground">Trouver un prestataire</button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="mb-4 text-2xl font-extrabold">Choisissez une catégorie</h2>
        <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-6 md:overflow-visible">
          {cats.map((c) => (
            <Link key={c.id} to="/recherche" search={{ cat: c.slug }}
              className="flex min-w-28 flex-col items-center gap-2 rounded-2xl border bg-card p-4 text-center text-sm font-semibold hover:border-primary hover:bg-accent">
              <span className="text-3xl">{c.emoji}</span>{c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-2xl font-extrabold">Prestataires recommandés</h2>
          <Link to="/recherche" className="text-sm font-bold underline decoration-primary decoration-2 underline-offset-4">Tout voir</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {providers.map((p) => <ProviderCard key={p.id} p={p} />)}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 md:grid-cols-3">
        {[
          { icon: ShieldCheck, t: "Prestataires vérifiés", d: "Identité et activité contrôlées par notre équipe." },
          { icon: CalendarCheck, t: "Disponibilités en temps réel", d: "Réservez un créneau libre, confirmé par le prestataire." },
          { icon: Wallet, t: "Wave, Orange Money, carte", d: "Bloquez votre date avec un acompte de 50 %, le solde le jour J." },
        ].map((f) => (
          <div key={f.t} className="rounded-2xl border bg-card p-6">
            <f.icon className="h-8 w-8 text-primary" />
            <h3 className="mt-3 text-lg font-bold">{f.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
        <div className="rounded-2xl bg-primary p-6 md:col-span-3 md:flex md:items-center md:justify-between">
          <div>
            <h3 className="text-2xl font-extrabold text-primary-foreground">Vous êtes prestataire ?</h3>
            <p className="text-primary-foreground/80">Recevez des commandes, gérez votre calendrier et vos revenus.</p>
          </div>
          <Link to="/auth" search={{ role: "provider" }} className="mt-4 inline-block rounded-full bg-ink px-6 py-3 font-bold text-ink-foreground md:mt-0">Créer mon espace pro</Link>
        </div>
      </section>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMyProvider } from "@/lib/pro";
import { PageHeader } from "@/components/AppShell";
import { errMsg, fcfa, unitLabel, isDayOnly } from "@/lib/format";
import { ServicePricingEditor } from "@/components/ServicePricingEditor";

export const Route = createFileRoute("/_authenticated/pro/services")({
  head: () => ({ meta: [{ title: "Mes services — Bës bi" }, { name: "description", content: "Services et tarifs." }, { property: "og:title", content: "Mes services — Bës bi" }, { property: "og:description", content: "Services." }] }),
  component: Services,
});

type CatalogItem = { id: string; name: string; description: string; price: number; unit: string; duration_minutes: number };

function Services() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: provider } = useMyProvider();
  const [f, setF] = useState({ name: "", description: "", price: "", unit: "forfait", duration_minutes: "60" });
  const { data = [] } = useQuery({
    queryKey: ["my-services", user?.id],
    queryFn: async () => (await supabase.from("services").select("*").eq("provider_id", user!.id).order("created_at")).data ?? [],
  });
  const { data: catalog = [] } = useQuery({
    queryKey: ["service-catalog", provider?.category_id],
    enabled: !!provider?.category_id,
    queryFn: async () => (await supabase.from("service_catalog").select("*").eq("category_id", provider!.category_id!).order("sort")).data as CatalogItem[] ?? [],
  });
  const { data: catSlug } = useQuery({
    queryKey: ["cat-slug", provider?.category_id],
    enabled: !!provider?.category_id,
    queryFn: async () => (await supabase.from("categories").select("slug").eq("id", provider!.category_id!).single()).data?.slug ?? null,
  });
  const dayOnly = isDayOnly(catSlug);
  const refresh = () => qc.invalidateQueries({ queryKey: ["my-services"] });

  const myNames = new Set(data.map((s) => s.name.toLowerCase()));
  const suggestions = catalog.filter((c) => !myNames.has(c.name.toLowerCase()));

  function pick(c: CatalogItem) {
    setF({ name: c.name, description: c.description, price: "", unit: c.unit, duration_minutes: String(c.duration_minutes || 60) });
    toast.success(`« ${c.name} » sélectionné — ajustez le prix puis validez`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const price = parseInt(f.price);
    if (f.name.trim().length < 2 || !(price >= 0)) return void toast.error("Nom et prix requis");
    const { error } = await supabase.from("services").insert({ provider_id: user!.id, name: f.name.trim().slice(0, 100), description: f.description.trim().slice(0, 500), price, unit: f.unit, duration_minutes: Math.max(15, parseInt(f.duration_minutes) || 60) });
    if (error) return void toast.error(errMsg(error));
    setF({ name: "", description: "", price: "", unit: "forfait", duration_minutes: "60" });
    refresh();
  }

  const inp = "w-full rounded-xl border bg-card px-3 py-2.5 text-sm";
  return (
    <div>
      <PageHeader title="Services & tarifs" />
      <form onSubmit={add} className="mb-6 grid gap-3 rounded-2xl border bg-card p-5 md:grid-cols-6">
        <input className={`${inp} md:col-span-2`} placeholder="Nom du service" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className={inp} type="number" placeholder="Prix FCFA" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} />
        <select className={inp} value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })}>
          <option value="forfait">Forfait</option><option value="unite">Par unité</option><option value="jour">Par jour</option><option value="heure">Par heure</option>
        </select>
        {!dayOnly && <input className={inp} type="number" placeholder="Durée (min)" value={f.duration_minutes} onChange={(e) => setF({ ...f, duration_minutes: e.target.value })} />}
        <button className="rounded-xl bg-primary font-bold text-primary-foreground">Ajouter</button>
        <input className={`${inp} md:col-span-6`} placeholder="Description (optionnel)" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
      </form>

      {suggestions.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">Services suggérés pour votre domaine</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {suggestions.map((c) => (
              <button key={c.id} type="button" onClick={() => pick(c)} className="flex items-center justify-between gap-3 rounded-2xl border border-dashed bg-card p-4 text-left transition hover:border-primary hover:bg-primary/5">
                <div>
                  <b className="text-sm">{c.name}</b>
                  <p className="text-xs text-muted-foreground">{c.price > 0 ? `${fcfa(c.price)} ${unitLabel[c.unit] ?? ""}` : "Prix à définir"} · {c.description}</p>
                </div>
                <Plus className="h-5 w-5 shrink-0 text-primary" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {data.map((s) => (
          <div key={s.id} className={`rounded-2xl border bg-card p-4 ${!s.active ? "opacity-50" : ""}`}>
          <div className="flex items-center justify-between gap-3">
            <div><b>{s.name}</b><p className="text-sm">{fcfa(s.price)} {unitLabel[s.unit]}{dayOnly ? "" : ` · ${s.duration_minutes} min`}</p></div>
            <div className="flex items-center gap-2">
              <button onClick={async () => { await supabase.from("services").update({ active: !s.active }).eq("id", s.id); refresh(); }} className="rounded-full border px-3 py-1.5 text-xs font-bold">{s.active ? "Masquer" : "Publier"}</button>
              <button aria-label="Supprimer" onClick={async () => { const { error } = await supabase.from("services").delete().eq("id", s.id); if (error) toast.error("Service lié à des réservations : masquez-le plutôt."); refresh(); }} className="p-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
          <ServicePricingEditor s={s} onSaved={refresh} />
          </div>
        ))}
        {data.length === 0 && <p className="text-muted-foreground">Choisissez un service suggéré ci-dessus ou créez le vôtre.</p>}
      </div>
    </div>
  );
}

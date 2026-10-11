import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { ProviderCard, providerSelect, minPrice, type ProviderRow } from "@/components/ProviderCard";
import { useCategories } from "./index";

const searchSchema = z.object({
  q: z.string().optional(),
  cat: z.string().optional(),
  city: z.string().optional(),
  min: z.coerce.number().optional(),
  max: z.coerce.number().optional(),
  rating: z.coerce.number().optional(),
  verified: z.coerce.boolean().optional(),
  travel: z.coerce.boolean().optional(),
  delivery: z.coerce.boolean().optional(),
});

export const Route = createFileRoute("/recherche")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Rechercher un prestataire — Bës bi" },
      { name: "description", content: "Filtrez les prestataires par catégorie, ville, prix, note et vérification." },
      { property: "og:title", content: "Rechercher un prestataire — Bës bi" },
      { property: "og:description", content: "Trouvez le bon prestataire pour votre événement au Sénégal." },
    ],
  }),
  component: SearchPage,
});

const CITIES = ["Dakar", "Thiès", "Diourbel", "Touba", "Saint-Louis", "Mbour", "Kaolack", "Ziguinchor"];

function SearchPage() {
  const s = Route.useSearch();
  const navigate = useNavigate({ from: "/recherche" });
  const set = (patch: Partial<typeof s>) => navigate({ search: (prev) => ({ ...prev, ...patch }) });
  const { data: cats = [] } = useCategories();

  const { data = [], isLoading } = useQuery({
    queryKey: ["search", s, cats.length],
    queryFn: async () => {
      let query = supabase.from("providers").select(providerSelect + ",description");
      const cat = cats.find((c) => c.slug === s.cat);
      if (cat) query = query.eq("category_id", cat.id);
      if (s.city) query = query.eq("city", s.city);
      if (s.rating) query = query.gte("rating_avg", s.rating);
      if (s.verified) query = query.eq("verified", true);
      if (s.travel) query = query.eq("travel_possible", true);
      if (s.delivery) query = query.eq("delivery_available", true);
      if (s.q) query = query.or(`business_name.ilike.%${s.q.replace(/[%,()]/g, "")}%,description.ilike.%${s.q.replace(/[%,()]/g, "")}%`);
      const rows = ((await query.order("rating_avg", { ascending: false })).data ?? []) as unknown as ProviderRow[];
      return rows.filter((p) => {
        const m = minPrice(p);
        if (s.min && (m === null || m < s.min)) return false;
        if (s.max && (m === null || m > s.max)) return false;
        return true;
      });
    },
  });

  const sel = "w-full rounded-xl border bg-card px-3 py-2.5 text-sm";
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <input defaultValue={s.q} onKeyDown={(e) => e.key === "Enter" && set({ q: (e.target as HTMLInputElement).value || undefined })}
        placeholder="🔎 Maquilleur, photographe, bâche, chaises..." className="mb-6 w-full rounded-2xl border-2 border-ink bg-card px-5 py-4 text-lg outline-none focus:border-primary" />
      <div className="grid gap-8 md:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <div><label className="mb-1 block text-xs font-bold uppercase">Catégorie</label>
            <select className={sel} value={s.cat ?? ""} onChange={(e) => set({ cat: e.target.value || undefined })}>
              <option value="">Toutes</option>
              {cats.map((c) => <option key={c.id} value={c.slug}>{c.emoji} {c.name}</option>)}
            </select></div>
          <div><label className="mb-1 block text-xs font-bold uppercase">Ville</label>
            <select className={sel} value={s.city ?? ""} onChange={(e) => set({ city: e.target.value || undefined })}>
              <option value="">Tout le Sénégal</option>
              {CITIES.map((c) => <option key={c}>{c}</option>)}
            </select></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="mb-1 block text-xs font-bold uppercase">Prix min</label>
              <input type="number" className={sel} defaultValue={s.min} onBlur={(e) => set({ min: e.target.value ? +e.target.value : undefined })} /></div>
            <div><label className="mb-1 block text-xs font-bold uppercase">Prix max</label>
              <input type="number" className={sel} defaultValue={s.max} onBlur={(e) => set({ max: e.target.value ? +e.target.value : undefined })} /></div>
          </div>
          <div><label className="mb-1 block text-xs font-bold uppercase">Note minimum</label>
            <select className={sel} value={s.rating ?? ""} onChange={(e) => set({ rating: e.target.value ? +e.target.value : undefined })}>
              <option value="">Toutes</option><option value="4">4★ et +</option><option value="4.5">4.5★ et +</option>
            </select></div>
          {([["verified", "Prestataire vérifié"], ["travel", "Déplacement possible"], ["delivery", "Livraison disponible"]] as const).map(([k, l]) => (
            <label key={k} className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="h-4 w-4 accent-[var(--primary)]" checked={!!s[k]} onChange={(e) => set({ [k]: e.target.checked || undefined })} />{l}
            </label>
          ))}
        </aside>
        <div>
          <p className="mb-4 text-sm text-muted-foreground">{isLoading ? "Recherche..." : `${data.length} prestataire(s)`}</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((p) => <ProviderCard key={p.id} p={p} />)}
          </div>
          {!isLoading && data.length === 0 && <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Aucun prestataire ne correspond à ces filtres.</p>}
        </div>
      </div>
    </div>
  );
}

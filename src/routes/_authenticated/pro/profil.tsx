import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useMyProvider } from "@/lib/pro";
import { PageHeader } from "@/components/AppShell";
import { useCategories } from "../../index";
import { errMsg } from "@/lib/format";
import { asZones, type TravelZone } from "@/lib/pricing";

export const Route = createFileRoute("/_authenticated/pro/profil")({
  head: () => ({ meta: [{ title: "Profil professionnel — Bës bi" }, { name: "description", content: "Présentez votre activité." }, { property: "og:title", content: "Profil pro — Bës bi" }, { property: "og:description", content: "Profil pro." }] }),
  component: ProProfile,
});

function ProProfile() {
  const { user } = useAuth();
  const { data: p } = useMyProvider();
  const { data: cats = [] } = useCategories();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState({ business_name: "", description: "", city: "Dakar", zone: "", category_id: "", cover_url: "", travel_possible: true, travel_fee: 0, delivery_available: false, payout_method: "wave", payout_phone: "", payout_name: "" });
  const [portfolio, setPortfolio] = useState<string[]>([]);
  const [zones, setZones] = useState<TravelZone[]>([]);
  const [uploading, setUploading] = useState<"cover" | "portfolio" | null>(null);

  useEffect(() => {
    if (p) {
      setF({ business_name: p.business_name, description: p.description, city: p.city, zone: p.zone, category_id: p.category_id ?? "", cover_url: p.cover_url ?? "", travel_possible: p.travel_possible, travel_fee: p.travel_fee, delivery_available: p.delivery_available, payout_method: p.payout_method ?? "wave", payout_phone: p.payout_phone ?? "", payout_name: (p as unknown as { payout_name?: string | null }).payout_name ?? "" });
      setPortfolio(p.portfolio ?? []);
      setZones(asZones((p as unknown as { travel_zones?: unknown }).travel_zones));
    }
  }, [p]);

  async function uploadPhoto(file: File): Promise<string | null> {
    if (!file.type.startsWith("image/")) { toast.error("Choisissez une image"); return null; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image trop lourde (10 Mo max)"); return null; }
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user!.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("provider-photos").upload(path, file);
    if (error) { toast.error(errMsg(error)); return null; }
    const { data } = await supabase.storage.from("provider-photos").createSignedUrl(path, 60 * 60 * 24 * 365);
    return data?.signedUrl ?? null;
  }

  async function onCoverFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading("cover");
    const url = await uploadPhoto(file);
    setUploading(null);
    if (url) { setF((prev) => ({ ...prev, cover_url: url })); toast.success("Photo de couverture ajoutée"); }
  }

  async function onPortfolioFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setUploading("portfolio");
    for (const file of files.slice(0, 20 - portfolio.length)) {
      const url = await uploadPhoto(file);
      if (url) setPortfolio((prev) => [...prev, url].slice(0, 20));
    }
    setUploading(null);
    toast.success("Photo(s) ajoutée(s) à vos réalisations");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (f.business_name.trim().length < 2) return void toast.error("Nom de l'entreprise requis");
    const phone = f.payout_phone.replace(/\s/g, "");
    if (phone && !/^\+?\d{9,15}$/.test(phone)) return void toast.error("Numéro de versement invalide");
    const row = {
      business_name: f.business_name.trim().slice(0, 100), description: f.description.trim().slice(0, 2000), city: f.city.trim().slice(0, 60),
      zone: f.zone.trim().slice(0, 200), category_id: f.category_id || null, cover_url: f.cover_url || null,
      portfolio: portfolio.slice(0, 20), travel_possible: f.travel_possible, travel_fee: Math.max(0, f.travel_fee), delivery_available: f.delivery_available,
      travel_zones: zones.filter((z) => z.city.trim()).slice(0, 50).map((z) => ({ city: z.city.trim().slice(0, 60), fee: Math.max(0, Math.round(z.fee)) })),
      payout_method: ["wave", "orange_money", "free_money"].includes(f.payout_method) ? f.payout_method : "wave", payout_phone: phone || null, payout_name: f.payout_name.trim().slice(0, 80) || null,
    };
    const { error } = p
      ? await supabase.from("providers").update(row).eq("id", user!.id)
      : await supabase.from("providers").insert({ ...row, id: user!.id });
    if (error) return void toast.error(errMsg(error));
    if (!p) await supabase.from("availability").insert([1, 2, 3, 4, 5, 6].map((d) => ({ provider_id: user!.id, weekday: d, start_time: "09:00", end_time: "18:00" })));
    toast.success("Profil enregistré");
    await qc.invalidateQueries({ queryKey: ["my-provider"] });
    await qc.invalidateQueries({ queryKey: ["payouts"] });
    if (!p) void navigate({ to: "/pro/services" });
  }

  const inp = "mt-1 w-full rounded-xl border bg-card px-4 py-2.5";
  return (
    <div className="max-w-2xl">
      <PageHeader title="Profil professionnel" subtitle="Ce que voient les clients" />
      <form onSubmit={save} className="space-y-4 rounded-2xl border bg-card p-6">
        <label className="block text-sm font-semibold">Nom de l'entreprise<input className={inp} value={f.business_name} onChange={(e) => setF({ ...f, business_name: e.target.value })} /></label>
        <label className="block text-sm font-semibold">Catégorie principale
          <select className={inp} value={f.category_id} onChange={(e) => setF({ ...f, category_id: e.target.value })}>
            <option value="">Choisir...</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select></label>
        <label className="block text-sm font-semibold">Présentation<textarea rows={4} className={inp} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">Ville<input className={inp} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></label>
          <label className="block text-sm font-semibold">Zone d'intervention<input className={inp} value={f.zone} placeholder="Dakar, Thiès..." onChange={(e) => setF({ ...f, zone: e.target.value })} /></label>
        </div>
        <div>
          <p className="text-sm font-semibold">Photo de couverture</p>
          {f.cover_url && (
            <div className="relative mt-2">
              <img src={f.cover_url} alt="Couverture" className="h-32 w-full rounded-xl object-cover" />
              <button type="button" onClick={() => setF({ ...f, cover_url: "" })} className="absolute right-2 top-2 rounded-full bg-ink/70 px-2 py-1 text-xs text-ink-foreground">Retirer</button>
            </div>
          )}
          <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 px-4 py-3 text-sm font-bold text-primary">
            📷 {uploading === "cover" ? "Envoi en cours..." : f.cover_url ? "Changer la photo" : "Choisir une photo"}
            <input type="file" accept="image/*" className="hidden" onChange={onCoverFile} disabled={uploading !== null} />
          </label>
        </div>
        <div>
          <p className="text-sm font-semibold">Mes réalisations ({portfolio.length}/20 photos)</p>
          {portfolio.length > 0 && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {portfolio.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt={`Réalisation ${i + 1}`} className="h-24 w-full rounded-lg object-cover" />
                  <button type="button" onClick={() => setPortfolio(portfolio.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-ink/70 px-1.5 text-xs text-ink-foreground">✕</button>
                </div>
              ))}
            </div>
          )}
          {portfolio.length < 20 && (
            <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 px-4 py-3 text-sm font-bold text-primary">
              🖼️ {uploading === "portfolio" ? "Envoi en cours..." : "Ajouter des photos"}
              <input type="file" accept="image/*" multiple className="hidden" onChange={onPortfolioFiles} disabled={uploading !== null} />
            </label>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm font-semibold">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.travel_possible} onChange={(e) => setF({ ...f, travel_possible: e.target.checked })} />Déplacement possible</label>
          {f.travel_possible && <label className="flex items-center gap-2">Frais par défaut (FCFA)<input type="number" className="w-28 rounded-lg border px-2 py-1" value={f.travel_fee} onChange={(e) => setF({ ...f, travel_fee: +e.target.value })} /></label>}
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.delivery_available} onChange={(e) => setF({ ...f, delivery_available: e.target.checked })} />Livraison</label>
        </div>
        {f.travel_possible && (
          <div className="rounded-xl border p-3 text-sm">
            <p className="font-semibold">🚗 Frais de déplacement par ville</p>
            <p className="text-xs text-muted-foreground">Les autres villes utilisent les frais par défaut.</p>
            {zones.map((z, i) => (
              <div key={i} className="mt-1 flex gap-2">
                <input className="flex-1 rounded-lg border px-2 py-1" placeholder="Ville (ex : Thiès)" value={z.city} onChange={(e) => setZones(zones.map((x, j) => (j === i ? { ...x, city: e.target.value } : x)))} />
                <input className="w-28 rounded-lg border px-2 py-1" type="number" placeholder="FCFA" value={z.fee || ""} onChange={(e) => setZones(zones.map((x, j) => (j === i ? { ...x, fee: +e.target.value } : x)))} />
                <button type="button" onClick={() => setZones(zones.filter((_, j) => j !== i))} className="px-2 text-destructive">✕</button>
              </div>
            ))}
            <button type="button" onClick={() => setZones([...zones, { city: "", fee: 0 }])} className="mt-1 text-xs font-bold text-primary">+ Ajouter une ville</button>
          </div>
        )}
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
          <p className="font-bold">Recevoir mon argent</p>
          <p className="text-xs text-muted-foreground">Dès qu'un client paie, votre part (moins la commission) est envoyée automatiquement sur ce numéro.</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">Moyen
              <select className={inp} value={f.payout_method} onChange={(e) => setF({ ...f, payout_method: e.target.value })}>
                <option value="wave">Wave</option><option value="orange_money">Orange Money</option><option value="free_money">Free Money</option>
              </select></label>
            <label className="block text-sm font-semibold">Numéro<input className={inp} inputMode="tel" placeholder="77 123 45 67" value={f.payout_phone} onChange={(e) => setF({ ...f, payout_phone: e.target.value })} /></label>
            <label className="block text-sm font-semibold">Nom du bénéficiaire<input className={inp} placeholder="Nom affiché sur Wave" value={f.payout_name} onChange={(e) => setF({ ...f, payout_name: e.target.value })} /></label>
          </div>
        </div>
        <button className="rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">{p ? "Enregistrer" : "Créer mon profil"}</button>
      </form>
    </div>
  );
}

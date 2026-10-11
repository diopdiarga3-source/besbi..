import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { errMsg, fcfa, statusLabel, payLabel , commissionOf, providerNetOf } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Administration — Bës bi" }, { name: "description", content: "Gestion de la plateforme." }, { property: "og:title", content: "Administration — Bës bi" }, { property: "og:description", content: "Admin." }] }),
  component: Admin,
});

const TABS = ["Tableau de bord", "Clients", "Prestataires", "Réservations", "Catégories", "Avis signalés", "Commissions", "Reversements"];

function Admin() {
  const { roles, loading } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState(TABS[0]);
  const isAdmin = roles.includes("admin");
  const { data } = useQuery({
    queryKey: ["admin"],
    enabled: isAdmin,
    queryFn: async () => {
      const [p, b, c, r, s, u, t, pr] = await Promise.all([
        supabase.from("providers").select("*, categories(name)").order("created_at", { ascending: false }),
        supabase.from("bookings").select("*, services(name), providers(business_name)").order("created_at", { ascending: false }).limit(200),
        supabase.from("categories").select("*").order("sort"),
        supabase.from("reviews").select("*").eq("reported", true),
        supabase.from("settings").select("*"),
        supabase.from("user_roles").select("user_id, role"),
        supabase.from("transactions").select("amount, type"),
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      ]);
      return { providers: p.data ?? [], bookings: b.data ?? [], cats: c.data ?? [], reported: r.data ?? [], settings: s.data ?? [], roles: u.data ?? [], tx: t.data ?? [], profiles: pr.data ?? [] };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const [cat, setCat] = useState({ name: "", emoji: "✨" });

  if (loading) return null;
  if (!isAdmin) return <div className="p-10 text-center text-muted-foreground">Accès réservé aux administrateurs.</div>;
  if (!data) return <div className="p-10 text-center text-muted-foreground">Chargement...</div>;

  const today = new Date().toISOString().slice(0, 10);
  const paidBookings = data.bookings.filter((b) => b.payment_status === "paid" || b.payment_status === "deposit");
  const catCount = new Map<string, number>();
  data.bookings.forEach((b) => { const p = data.providers.find((x) => x.id === b.provider_id); const n = p?.categories?.name ?? "?"; catCount.set(n, (catCount.get(n) ?? 0) + 1); });
  const provCount = new Map<string, number>();
  data.bookings.forEach((b) => provCount.set(b.providers?.business_name ?? "?", (provCount.get(b.providers?.business_name ?? "?") ?? 0) + 1));
  const roleMap = new Map<string, string[]>();
  data.roles.forEach((r) => roleMap.set(r.user_id, [...(roleMap.get(r.user_id) ?? []), r.role]));
  const clientRows = data.profiles
    .filter((p) => (roleMap.get(p.id) ?? []).includes("client"))
    .map((p) => ({ ...p, roles: roleMap.get(p.id) ?? [] }));

  const kpis = [
    ["Clients", data.roles.filter((r) => r.role === "client").length], ["Prestataires", data.providers.length],
    ["Réservations du jour", data.bookings.filter((b) => b.created_at.slice(0, 10) === today).length],
    ["Volume transactions", fcfa(data.tx.filter((t) => t.type === "payment").reduce((s, t) => s + t.amount, 0))],
    ["Commissions", fcfa(data.bookings.filter((b) => b.status === "completed").reduce((s, b) => s + commissionOf(b.total), 0))],
    ["Réservations payées", paidBookings.length],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageHeader title="Administration" />
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((t) => <button key={t} onClick={() => setTab(t)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${tab === t ? "bg-ink text-ink-foreground" : "bg-muted"}`}>{t}{t === "Avis signalés" && data.reported.length ? ` (${data.reported.length})` : ""}</button>)}
      </div>

      {tab === "Tableau de bord" && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {kpis.map(([l, v]) => <div key={l} className="rounded-2xl border bg-card p-5"><p className="text-2xl font-extrabold">{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>)}
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            {[["Prestataires les plus actifs", provCount], ["Catégories populaires", catCount]].map(([t, m]) => (
              <div key={t as string} className="rounded-2xl border bg-card p-5">
                <h2 className="mb-3 font-bold">{t as string}</h2>
                {[...(m as Map<string, number>).entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => <div key={k} className="flex justify-between py-1 text-sm"><span>{k}</span><b>{v}</b></div>)}
                {(m as Map<string, number>).size === 0 && <p className="text-sm text-muted-foreground">Pas encore de données.</p>}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "Clients" && (
        <div className="overflow-hidden rounded-2xl border bg-card">
          {clientRows.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-b p-4 last:border-0">
              <div>
                <b className="flex flex-wrap items-center gap-2">
                  {c.full_name || "Sans nom"}
                  {c.roles.includes("provider") && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">Prestataire</span>}
                  {c.roles.includes("admin") && <span className="rounded-full bg-ink px-2 py-0.5 text-[10px] font-bold text-ink-foreground">Admin</span>}
                </b>
                <p className="text-sm text-muted-foreground">{[c.phone, c.city].filter(Boolean).join(" · ") || "—"}</p>
              </div>
              <span className="text-xs text-muted-foreground">Inscrit le {new Date(c.created_at).toLocaleDateString("fr-FR")}</span>
            </div>
          ))}
          {clientRows.length === 0 && <p className="p-8 text-center text-muted-foreground">Aucun client inscrit.</p>}
        </div>
      )}

      {tab === "Prestataires" && (
        <div className="overflow-hidden rounded-2xl border bg-card">
          {data.providers.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b p-4 last:border-0">
              <div><b className="flex items-center gap-1">{p.business_name}{p.verified && <BadgeCheck className="h-4 w-4 fill-primary" />}</b><p className="text-sm text-muted-foreground">{p.categories?.name} · {p.city} · {Number(p.rating_avg).toFixed(1)}★</p></div>
              <div className="flex gap-2">
                <button onClick={async () => { const { error } = await supabase.from("providers").update({ verified: !p.verified }).eq("id", p.id); if (error) toast.error(errMsg(error)); refresh(); }}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold ${p.verified ? "bg-muted" : "bg-primary text-primary-foreground"}`}>{p.verified ? "Retirer vérification" : "Vérifier"}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "Réservations" && (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left"><tr><th className="p-3">Date</th><th>Prestataire</th><th>Service</th><th>Total</th><th>Statut</th><th>Paiement</th><th></th></tr></thead>
            <tbody>
              {data.bookings.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="p-3">{new Date(b.date).toLocaleDateString("fr-FR")}</td><td>{b.providers?.business_name}</td><td>{b.services?.name}</td>
                  <td>{fcfa(b.total)}</td><td>{statusLabel[b.status]}</td><td>{payLabel[b.payment_status]}</td>
                  <td>{["pending", "accepted"].includes(b.status) && <button onClick={async () => { const { error } = await supabase.rpc("set_booking_status", { _booking: b.id, _status: "cancelled" }); if (error) toast.error(errMsg(error)); else toast.success("Annulée et remboursée"); refresh(); }} className="text-xs font-bold text-destructive">Annuler + rembourser</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.bookings.length === 0 && <p className="p-8 text-center text-muted-foreground">Aucune réservation.</p>}
        </div>
      )}

      {tab === "Reversements" && (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left"><tr><th className="p-3">Date</th><th>Prestataire</th><th>Wave / OM</th><th>Payé client</th><th>Bës bi 1 %</th><th>À reverser 99 %</th><th></th></tr></thead>
            <tbody>
              {data.bookings.filter((b) => b.payment_status === "paid" && b.status === "completed").map((b) => {
                const pr = data.providers.find((x) => x.id === b.provider_id) as unknown as { payout_phone?: string | null; payout_name?: string | null; payout_method?: string | null } | undefined;
                const done = !!b.payout_done_at;
                return (
                  <tr key={b.id} className="border-t">
                    <td className="p-3">{new Date(b.date).toLocaleDateString("fr-FR")}</td><td>{b.providers?.business_name}</td>
                    <td>{pr?.payout_phone ? `${pr.payout_method === "orange_money" ? "OM" : "Wave"} ${pr.payout_phone}${pr.payout_name ? ` (${pr.payout_name})` : ""}` : "—"}</td>
                    <td>{fcfa(b.total)}</td><td>{fcfa(commissionOf(b.total))}</td><td className="font-bold">{fcfa(providerNetOf(b.total))}</td>
                    <td className="p-2">{done ? <span className="text-xs font-bold text-success">Reversé ✓</span> : <button onClick={async () => { if (!confirm(`Confirmer le reversement de ${fcfa(providerNetOf(b.total))} ?`)) return; const { error } = await supabase.rpc("mark_payout_done" as never, { _booking: b.id, _done: true } as never); if (error) toast.error(errMsg(error)); else { toast.success("Reversement enregistré"); refresh(); } }} className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Marquer reversé</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="p-3 text-xs text-muted-foreground">Commandes payées et terminées. Envoyez le montant au prestataire puis cliquez « Marquer reversé ».</p>
        </div>
      )}

      {tab === "Catégories" && (
        <div>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const name = cat.name.trim().slice(0, 60);
            if (name.length < 2) return;
            const slug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-");
            const { error } = await supabase.from("categories").insert({ name, slug, emoji: cat.emoji.slice(0, 4), sort: data.cats.length + 1 });
            if (error) toast.error(errMsg(error)); else { setCat({ name: "", emoji: "✨" }); refresh(); }
          }} className="mb-4 flex gap-2">
            <input value={cat.emoji} onChange={(e) => setCat({ ...cat, emoji: e.target.value })} className="w-16 rounded-xl border px-3 text-center" />
            <input value={cat.name} onChange={(e) => setCat({ ...cat, name: e.target.value })} placeholder="Nouvelle catégorie" className="flex-1 rounded-xl border px-4 py-2.5" />
            <button className="rounded-xl bg-primary px-5 font-bold text-primary-foreground">Ajouter</button>
          </form>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {data.cats.map((c) => (
              <div key={c.id} className="flex items-center gap-2 rounded-xl border bg-card p-3">
                <span className="text-xl">{c.emoji}</span>
                <input defaultValue={c.name} onBlur={async (e) => { if (e.target.value.trim() && e.target.value !== c.name) { await supabase.from("categories").update({ name: e.target.value.trim().slice(0, 60) }).eq("id", c.id); refresh(); } }} className="flex-1 bg-transparent font-semibold" />
                <button aria-label="Supprimer" onClick={async () => { if (!confirm(`Supprimer ${c.name} ?`)) return; const { error } = await supabase.from("categories").delete().eq("id", c.id); if (error) toast.error(errMsg(error)); refresh(); }}><Trash2 className="h-4 w-4 text-destructive" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "Avis signalés" && (
        <div className="space-y-3">
          {data.reported.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-3 rounded-2xl border bg-card p-4">
              <div><b>{r.rating}/5</b><p className="text-sm">{r.comment}</p></div>
              <div className="flex gap-2">
                <button onClick={async () => { await supabase.from("reviews").update({ reported: false }).eq("id", r.id); refresh(); }} className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold">Conserver</button>
                <button onClick={async () => { await supabase.from("reviews").delete().eq("id", r.id); refresh(); }} className="rounded-full bg-destructive px-3 py-1.5 text-xs font-bold text-destructive-foreground">Supprimer</button>
              </div>
            </div>
          ))}
          {data.reported.length === 0 && <p className="text-muted-foreground">Aucun avis signalé.</p>}
        </div>
      )}

      {tab === "Commissions" && (
        <div className="max-w-md space-y-3 rounded-2xl border bg-card p-5">
          {data.settings.map((s) => (
            <label key={s.key} className="flex items-center justify-between gap-3 text-sm font-semibold">
              {s.key === "commission_rate" ? "Commission prestataire (%)" : "Frais de service client (%)"}
              <input type="number" min={0} max={50} defaultValue={Number(s.value)} onBlur={async (e) => {
                const v = Math.min(50, Math.max(0, +e.target.value));
                const { error } = await supabase.from("settings").update({ value: v }).eq("key", s.key);
                if (error) toast.error(errMsg(error)); else toast.success("Enregistré");
              }} className="w-24 rounded-lg border px-3 py-2" />
            </label>
          ))}
          <p className="text-xs text-muted-foreground">Exemple : prestation 50 000 FCFA, commission 10 % → 5 000 FCFA pour la plateforme, 45 000 FCFA pour le prestataire.</p>
        </div>
      )}
    </div>
  );
}

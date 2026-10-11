import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useProBookings } from "@/lib/pro";
import { PageHeader } from "@/components/AppShell";
import { fcfa } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pro/stats")({
  head: () => ({ meta: [{ title: "Statistiques — Bës bi Pro" }, { name: "description", content: "Chiffre d'affaires et commandes." }, { property: "og:title", content: "Statistiques — Bës bi Pro" }, { property: "og:description", content: "Stats." }] }),
  component: Stats,
});

const RANGES = [{ l: "7 jours", d: 7 }, { l: "30 jours", d: 30 }, { l: "3 mois", d: 90 }, { l: "6 mois", d: 180 }, { l: "1 an", d: 365 }];
const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function Stats() {
  const { data = [] } = useProBookings();
  const [range, setRange] = useState(30);
  const since = new Date(Date.now() - range * 864e5).toISOString().slice(0, 10);
  const rows = data.filter((b) => b.created_at.slice(0, 10) >= since);
  const done = rows.filter((b) => b.status === "completed");
  const gross = done.reduce((s, b) => s + b.subtotal + b.travel_fee, 0);
  const net = done.reduce((s, b) => s + b.provider_amount, 0);
  const cancelRate = rows.length ? Math.round((rows.filter((b) => ["cancelled", "rejected"].includes(b.status)).length / rows.length) * 100) : 0;
  const clients = new Set(rows.map((b) => b.client_id));
  const before = new Set(data.filter((b) => b.created_at.slice(0, 10) < since).map((b) => b.client_id));
  const newClients = [...clients].filter((c) => !before.has(c)).length;
  const svc = new Map<string, number>();
  rows.forEach((b) => svc.set(b.services?.name ?? "?", (svc.get(b.services?.name ?? "?") ?? 0) + 1));
  const top = [...svc.entries()].sort((a, b) => b[1] - a[1])[0];
  const byDay = DAYS.map((d, i) => ({ d, n: rows.filter((b) => new Date(b.date + "T00:00").getDay() === i).length }));
  const buckets = new Map<string, { k: string; revenus: number; commandes: number }>();
  rows.forEach((b) => {
    const k = range <= 30 ? b.created_at.slice(5, 10) : b.created_at.slice(0, 7);
    const e = buckets.get(k) ?? { k, revenus: 0, commandes: 0 };
    e.commandes++; if (b.status === "completed") e.revenus += b.provider_amount;
    buckets.set(k, e);
  });
  const series = [...buckets.values()].sort((a, b) => a.k.localeCompare(b.k));

  const kpis = [
    ["Chiffre d'affaires", fcfa(gross)], ["Revenus nets", fcfa(net)], ["Commandes", rows.length], ["Clients", clients.size],
    ["Nouveaux clients", newClients], ["Taux d'annulation", `${cancelRate} %`], ["Service le plus vendu", top?.[0] ?? "—"],
  ];
  return (
    <div>
      <PageHeader title="Mes statistiques" />
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {RANGES.map((r) => <button key={r.d} onClick={() => setRange(r.d)} className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-bold ${range === r.d ? "bg-ink text-ink-foreground" : "bg-muted"}`}>{r.l}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map(([l, v]) => <div key={l} className="rounded-2xl border bg-card p-4"><p className="text-xl font-extrabold">{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>)}
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Chart title="Évolution des revenus" data={series} k="revenus" x="k" />
        <Chart title="Évolution des commandes" data={series} k="commandes" x="k" />
        <Chart title="Jours les plus demandés" data={byDay} k="n" x="d" />
      </div>
    </div>
  );
}

function Chart({ title, data, k, x }: { title: string; data: object[]; k: string; x: string }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <h2 className="mb-3 font-bold">{title}</h2>
      <div className="h-56">
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey={x} fontSize={11} /><YAxis fontSize={11} width={50} />
            <Tooltip /><Bar dataKey={k} fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

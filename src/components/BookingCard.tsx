import type { ReactNode } from "react";
import { MEASURE_KEYS, type Measures } from "@/lib/measures";
import { requirementsSummary } from "@/lib/category-questions";
import { fcfa, payLabel, statusLabel, statusTone } from "@/lib/format";

export type BookingRow = {
  id: string; date: string; start_time: string; quantity: number; location: string; notes: string;
  total: number; provider_amount: number; status: string; payment_status: string; client_id: string; provider_id: string;
  location_lat?: number | null; location_lng?: number | null;
  needed_by?: string | null;
  measurements?: unknown;
  requirements?: unknown;
  services: { name: string; providers?: { categories?: { slug: string } | null } | null } | null;
  providers?: { business_name: string; categories?: { slug: string } | null } | null;
};

export function BookingCard({ b, title, children, amount }: { b: BookingRow; title: string; children?: ReactNode; amount?: number }) {
  const catSlug = b.providers?.categories?.slug ?? b.services?.providers?.categories?.slug ?? null;
  const reqs = requirementsSummary(catSlug, (b.requirements ?? null) as Record<string, unknown> | null);
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{title}</p>
          <h3 className="text-lg font-bold">{b.services?.name}</h3>
          <p className="text-sm">{new Date(b.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}{b.start_time.slice(0, 5) !== "00:00" ? ` à ${b.start_time.slice(0, 5)}` : ""}{b.quantity > 1 ? ` · ×${b.quantity}` : ""}</p>
          <p className="text-sm text-muted-foreground">📍 {b.location}</p>
          {b.needed_by && <p className="mt-1 text-sm font-bold text-primary">👗 Habit souhaité pour le {new Date(b.needed_by).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</p>}
          {b.location_lat != null && b.location_lng != null && (
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${b.location_lat},${b.location_lng}`} target="_blank" rel="noreferrer"
              className="mt-1 inline-block rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">🧭 Itinéraire GPS</a>
          )}
          {b.measurements != null && <MeasuresView m={b.measurements as Measures} />}
          {reqs.length > 0 && (
            <div className="mt-2 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
              <p className="font-bold">✨ Attentes du client</p>
              <div className="mt-1 space-y-0.5">
                {reqs.map((r) => <p key={r.label}>{r.label} : <b>{r.value}</b></p>)}
              </div>
            </div>
          )}
          {b.notes && <p className="mt-1 text-sm italic text-muted-foreground">« {b.notes} »</p>}
        </div>
        <div className="text-right">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone[b.status]}`}>{statusLabel[b.status]}</span>
          <p className="mt-2 text-lg font-extrabold">{fcfa(amount ?? b.total)}</p>
          <p className="text-xs text-muted-foreground">{payLabel[b.payment_status]}</p>
          
        </div>
      </div>
      {children && <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">{children}</div>}
    </div>
  );
}

export const btn = "rounded-full px-4 py-2 text-sm font-bold";

function MeasuresView({ m }: { m: Measures }) {
  return (
    <details className="mt-2 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
      <summary className="cursor-pointer font-bold">🧵 Mesures du client</summary>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
        {MEASURE_KEYS.map(([k, l]) => m[k] != null && <p key={k}>{l} : <b>{m[k]} cm</b></p>)}
      </div>
      {m["taille"] != null && <p className="mt-1 text-xs text-muted-foreground">Taille du client : {m["taille"]} cm</p>}
    </details>
  );
}

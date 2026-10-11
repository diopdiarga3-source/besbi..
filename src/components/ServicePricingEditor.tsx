import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EVENT_TYPES, asEventPrices, asOptions, type ServiceOption } from "@/lib/pricing";
import { errMsg } from "@/lib/format";

type Svc = { id: string; options: unknown; event_prices: unknown; guest_price: number; guests_included: number };

export function ServicePricingEditor({ s, onSaved }: { s: Svc; onSaved: () => void }) {
  const [opts, setOpts] = useState<ServiceOption[]>(asOptions(s.options));
  const [ev, setEv] = useState<Record<string, number>>(asEventPrices(s.event_prices));
  const [gp, setGp] = useState(s.guest_price);
  const [gi, setGi] = useState(s.guests_included);
  const [busy, setBusy] = useState(false);
  const inp = "rounded-lg border bg-card px-2 py-1.5 text-sm";

  async function save() {
    setBusy(true);
    const options = opts.filter((o) => o.label.trim()).slice(0, 30).map((o) => ({ label: o.label.trim().slice(0, 80), price: Math.max(0, Math.round(o.price)) }));
    const event_prices = Object.fromEntries(Object.entries(ev).filter(([, v]) => v > 0).map(([k, v]) => [k, Math.round(v)]));
    const { error } = await supabase.from("services").update({ options, event_prices, guest_price: Math.max(0, gp), guests_included: Math.max(0, gi) }).eq("id", s.id);
    setBusy(false);
    if (error) return void toast.error(errMsg(error));
    toast.success("Tarifs enregistrés");
    onSaved();
  }

  return (
    <details className="mt-3 rounded-xl border bg-muted/30 p-3 text-sm">
      <summary className="cursor-pointer font-bold">💰 Prix variables</summary>
      <div className="mt-3 space-y-4">
        <div>
          <p className="font-semibold">Options supplémentaires</p>
          {opts.map((o, i) => (
            <div key={i} className="mt-1 flex gap-2">
              <input className={`${inp} flex-1`} placeholder="Ex : Décoration florale" value={o.label} onChange={(e) => setOpts(opts.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <input className={`${inp} w-28`} type="number" placeholder="+ FCFA" value={o.price || ""} onChange={(e) => setOpts(opts.map((x, j) => (j === i ? { ...x, price: +e.target.value } : x)))} />
              <button type="button" onClick={() => setOpts(opts.filter((_, j) => j !== i))} className="px-2 text-destructive">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setOpts([...opts, { label: "", price: 0 }])} className="mt-1 text-xs font-bold text-primary">+ Ajouter une option</button>
        </div>
        <div>
          <p className="font-semibold">Supplément selon l'événement</p>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {EVENT_TYPES.map((t) => (
              <label key={t} className="flex items-center justify-between gap-2">{t}
                <input className={`${inp} w-24`} type="number" placeholder="+0" value={ev[t] || ""} onChange={(e) => setEv({ ...ev, [t]: +e.target.value })} />
              </label>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2">Invités inclus<input className={`${inp} w-20`} type="number" value={gi} onChange={(e) => setGi(+e.target.value)} /></label>
          <label className="flex items-center gap-2">Par invité en plus (FCFA)<input className={`${inp} w-24`} type="number" value={gp} onChange={(e) => setGp(+e.target.value)} /></label>
        </div>
        <button type="button" disabled={busy} onClick={() => void save()} className="rounded-full bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-60">{busy ? "..." : "Enregistrer"}</button>
      </div>
    </details>
  );
}

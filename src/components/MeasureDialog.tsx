import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { estimateMeasurements } from "@/lib/measurements.functions";
import { MEASURE_KEYS, type Measures } from "@/lib/measures";
import type { BookingRow } from "@/components/BookingCard";
import { errMsg } from "@/lib/format";

async function shrink(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

export type MeasureValue = { measures: Record<string, number | null>; taille: number; genre: "homme" | "femme" };

/** Formulaire de mesures réutilisable : photo + calcul IA + correction manuelle. */
export function MeasureForm({ initial, onChange }: { initial?: Measures; onChange?: (v: MeasureValue | null) => void }) {
  const estimate = useServerFn(estimateMeasurements);
  const existing = initial ?? {};
  const [height, setHeight] = useState(Number(existing["taille"]) || 170);
  const [gender, setGender] = useState<"homme" | "femme">(existing["genre"] === "homme" ? "homme" : "femme");
  const [photo, setPhoto] = useState<string | null>(null);
  const [m, setM] = useState<Record<string, number | null>>(() => Object.fromEntries(MEASURE_KEYS.map(([k]) => [k, typeof existing[k] === "number" ? (existing[k] as number) : null])));
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string>("");

  function emit(next: Record<string, number | null>, h = height, g = gender) {
    const has = Object.values(next).some((v) => typeof v === "number");
    onChange?.(has ? { measures: next, taille: h, genre: g } : null);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = "";
    if (!f || !f.type.startsWith("image/")) return;
    setPhoto(await shrink(f));
  }
  async function analyse() {
    if (!photo) return void toast.error("Ajoutez d'abord une photo");
    setBusy(true);
    try {
      const r = await estimate({ data: { image: photo, heightCm: height, gender } });
      setM(r.measures);
      emit(r.measures);
      setInfo(`Fiabilité : ${r.fiabilite}. ${r.conseil}`);
      toast.success("Mesures calculées, vérifiez-les avant d'envoyer");
    } catch (err) { toast.error(errMsg(err)); }
    setBusy(false);
  }

  const inp = "w-full rounded-lg border bg-card px-2 py-1.5";
  return (
    <div>
      <p className="text-xs text-muted-foreground">Prenez une photo de face, debout, en entier (tête aux pieds), vêtements près du corps. Les mesures sont une estimation : corrigez-les si besoin.</p>
      <div className="mt-3 grid grid-cols-2 gap-3 text-sm font-semibold">
        <label>Votre taille (cm)<input type="number" className={inp} value={height} onChange={(e) => { setHeight(+e.target.value); emit(m, +e.target.value, gender); }} /></label>
        <label>Vous êtes
          <select className={inp} value={gender} onChange={(e) => { const g = e.target.value as "homme" | "femme"; setGender(g); emit(m, height, g); }}><option value="femme">Femme</option><option value="homme">Homme</option></select>
        </label>
      </div>
      <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5 px-4 py-3 text-sm font-bold text-primary">
        📷 {photo ? "Changer la photo" : "Prendre / choisir une photo"}
        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
      </label>
      {photo && <img src={photo} alt="Votre photo" className="mx-auto mt-2 max-h-48 rounded-lg" />}
      <button type="button" onClick={analyse} disabled={busy || !photo} className="mt-3 w-full rounded-xl bg-ink py-2.5 font-bold text-ink-foreground disabled:opacity-50">{busy ? "Calcul en cours..." : "Calculer mes mesures"}</button>
      {info && <p className="mt-2 text-xs text-muted-foreground">{info}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold">
        {MEASURE_KEYS.map(([k, l]) => (
          <label key={k}>{l} (cm)<input type="number" className={inp} value={m[k] ?? ""} onChange={(e) => { const next = { ...m, [k]: e.target.value ? +e.target.value : null }; setM(next); emit(next); }} /></label>
        ))}
      </div>
    </div>
  );
}

export function MeasureDialog({ b, onClose }: { b: BookingRow; onClose: () => void }) {
  const [value, setValue] = useState<MeasureValue | null>(null);
  async function save() {
    if (!value) return void toast.error("Calculez ou saisissez vos mesures d'abord");
    const { error } = await supabase.rpc("set_booking_measurements", { _booking: b.id, _m: { ...value.measures, taille: value.taille, genre: value.genre } });
    if (error) toast.error(errMsg(error)); else { toast.success("Mesures envoyées au tailleur"); onClose(); }
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl bg-card p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-extrabold">🧵 Mes mesures par photo</h2>
        <div className="mt-4"><MeasureForm initial={(b.measurements ?? {}) as Measures} onChange={setValue} /></div>
        <button onClick={save} className="mt-4 w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground">Envoyer au tailleur</button>
      </div>
    </div>
  );
}

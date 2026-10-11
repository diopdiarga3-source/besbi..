import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProBookings } from "@/lib/pro";
import { PageHeader } from "@/components/AppShell";
import { Calendar } from "@/components/ui/calendar";
import { errMsg, statusLabel } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pro/calendrier")({
  head: () => ({ meta: [{ title: "Calendrier — Bës bi Pro" }, { name: "description", content: "Disponibilités et rendez-vous." }, { property: "og:title", content: "Calendrier — Bës bi Pro" }, { property: "og:description", content: "Calendrier." }] }),
  component: Cal,
});

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function Cal() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: bookings = [] } = useProBookings();
  const [day, setDay] = useState<Date>(new Date());
  const { data } = useQuery({
    queryKey: ["pro-cal", user?.id],
    queryFn: async () => {
      const [a, b] = await Promise.all([
        supabase.from("availability").select("*").eq("provider_id", user!.id).order("weekday"),
        supabase.from("blocked_dates").select("*").eq("provider_id", user!.id),
      ]);
      return { avail: a.data ?? [], blocked: b.data ?? [] };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["pro-cal"] });
  const dayStr = format(day, "yyyy-MM-dd");
  const active = bookings.filter((b) => ["pending", "accepted"].includes(b.status));
  const bookedDays = active.map((b) => new Date(b.date + "T00:00"));
  const blockedDays = (data?.blocked ?? []).map((b) => new Date(b.date + "T00:00"));
  const isBlocked = data?.blocked.find((b) => b.date === dayStr);

  async function toggleBlock() {
    const { error } = isBlocked
      ? await supabase.from("blocked_dates").delete().eq("id", isBlocked.id)
      : await supabase.from("blocked_dates").insert({ provider_id: user!.id, date: dayStr });
    if (error) toast.error(errMsg(error)); else refresh();
  }
  async function addSlot(weekday: number) {
    const { error } = await supabase.from("availability").insert({ provider_id: user!.id, weekday, start_time: "09:00", end_time: "18:00" });
    if (error) toast.error(errMsg(error)); else refresh();
  }
  async function updateSlot(id: string, patch: { start_time?: string; end_time?: string }) {
    await supabase.from("availability").update(patch).eq("id", id); refresh();
  }

  return (
    <div>
      <PageHeader title="Calendrier" subtitle="Les réservations bloquent automatiquement le créneau" />
      <div className="grid gap-6 md:grid-cols-[auto_1fr]">
        <div className="rounded-2xl border bg-card p-3">
          <Calendar mode="single" locale={fr} selected={day} onSelect={(d) => d && setDay(d)}
            modifiers={{ booked: bookedDays, blocked: blockedDays }}
            modifiersClassNames={{ booked: "!bg-primary !text-primary-foreground font-bold rounded-md", blocked: "line-through opacity-40" }} />
          <div className="mt-2 flex gap-3 px-2 text-xs"><span className="flex items-center gap-1"><i className="h-3 w-3 rounded bg-primary" />Réservé</span><span className="line-through opacity-50">Bloqué</span></div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold capitalize">{format(day, "EEEE d MMMM", { locale: fr })}</h2>
              <button onClick={toggleBlock} className={`rounded-full px-4 py-2 text-sm font-bold ${isBlocked ? "bg-muted" : "bg-ink text-ink-foreground"}`}>{isBlocked ? "Débloquer la date" : "Bloquer la date"}</button>
            </div>
            <div className="mt-3 space-y-2">
              {active.filter((b) => b.date === dayStr).map((b) => (
                <div key={b.id} className="flex justify-between rounded-xl bg-muted p-3 text-sm"><span><b>{b.start_time.slice(0, 5)}</b> · {b.services?.name} · {b.client?.full_name}</span><span>{statusLabel[b.status]}</span></div>
              ))}
              {!active.some((b) => b.date === dayStr) && <p className="text-sm text-muted-foreground">Aucun rendez-vous ce jour.</p>}
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 font-bold">Horaires hebdomadaires</h2>
            <div className="space-y-2">
              {DAYS.map((d, i) => {
                const slots = (data?.avail ?? []).filter((a) => a.weekday === i);
                return (
                  <div key={d} className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="w-10 font-bold">{d}</span>
                    {slots.map((s) => (
                      <span key={s.id} className="flex items-center gap-1 rounded-lg border px-2 py-1">
                        <input type="time" defaultValue={s.start_time.slice(0, 5)} onBlur={(e) => updateSlot(s.id, { start_time: e.target.value })} className="bg-transparent" />–
                        <input type="time" defaultValue={s.end_time.slice(0, 5)} onBlur={(e) => updateSlot(s.id, { end_time: e.target.value })} className="bg-transparent" />
                        <button aria-label="Supprimer" onClick={async () => { await supabase.from("availability").delete().eq("id", s.id); refresh(); }}><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                      </span>
                    ))}
                    {slots.length === 0 && <span className="text-muted-foreground">Fermé</span>}
                    <button onClick={() => addSlot(i)} className="text-xs font-bold underline">+ plage</button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

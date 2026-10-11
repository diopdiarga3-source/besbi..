import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProBookings } from "@/lib/pro";
import { PageHeader } from "@/components/AppShell";
import { BookingCard, btn, type BookingRow } from "@/components/BookingCard";
import { errMsg } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/pro/commandes")({
  head: () => ({ meta: [{ title: "Commandes — Bës bi Pro" }, { name: "description", content: "Gérez vos commandes." }, { property: "og:title", content: "Commandes — Bës bi Pro" }, { property: "og:description", content: "Commandes." }] }),
  component: Orders,
});

const TABS = [
  { k: "pending", l: "Nouvelles" }, { k: "accepted", l: "Acceptées" }, { k: "completed", l: "Terminées" }, { k: "cancelled", l: "Annulées / refusées" },
];

function Orders() {
  const { data = [] } = useProBookings();
  const qc = useQueryClient();
  const [tab, setTab] = useState("pending");
  async function act(id: string, status: "accepted" | "rejected" | "completed" | "cancelled") {
    const { error } = await supabase.rpc("set_booking_status", { _booking: id, _status: status });
    if (error) toast.error(errMsg(error)); else { toast.success("Commande mise à jour"); qc.invalidateQueries({ queryKey: ["pro-bookings"] }); }
  }
  const list = data.filter((b) => (tab === "cancelled" ? ["cancelled", "rejected"].includes(b.status) : b.status === tab));
  return (
    <div>
      <PageHeader title="Commandes" />
      <div className="mb-6 flex gap-2 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.k} onClick={() => setTab(t.k)} className={`${btn} whitespace-nowrap ${tab === t.k ? "bg-ink text-ink-foreground" : "bg-muted"}`}>
            {t.l} ({data.filter((b) => (t.k === "cancelled" ? ["cancelled", "rejected"].includes(b.status) : b.status === t.k)).length})
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {list.map((b) => (
          <BookingCard key={b.id} b={b as unknown as BookingRow} amount={b.provider_amount} title={`${b.client?.full_name || "Client"} · ${b.client?.phone ?? ""}`}>
            {b.status === "pending" && <>
              <button onClick={() => act(b.id, "accepted")} className={`${btn} bg-primary text-primary-foreground`}>Accepter</button>
              <button onClick={() => act(b.id, "rejected")} className={`${btn} border text-destructive`}>Refuser</button>
            </>}
            {b.status === "accepted" && <>
              <button onClick={() => confirm("Confirmez-vous que le service a bien été réalisé ?") && act(b.id, "completed")} className={`${btn} bg-ink text-ink-foreground`}>Prestation terminée</button>
              <button onClick={() => confirm("Annuler ? Le client sera remboursé.") && act(b.id, "cancelled")} className={`${btn} border text-destructive`}>Annuler</button>
            </>}
            <Link to="/messages/$bookingId" params={{ bookingId: b.id }} className={`${btn} bg-muted`}>Contacter le client</Link>
          </BookingCard>
        ))}
        {list.length === 0 && <p className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Aucune commande.</p>}
      </div>
    </div>
  );
}

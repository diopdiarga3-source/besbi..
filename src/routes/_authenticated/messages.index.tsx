import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/messages/")({
  head: () => ({ meta: [{ title: "Messages — Bës bi" }, { name: "description", content: "Vos conversations." }, { property: "og:title", content: "Messages — Bës bi" }, { property: "og:description", content: "Messagerie." }] }),
  component: Inbox,
});

function Inbox() {
  const { user } = useAuth();
  const { data = [] } = useQuery({
    queryKey: ["inbox", user?.id],
    queryFn: async () => {
      const { data: b } = await supabase.from("bookings").select("id, date, client_id, provider_id, services(name), providers(business_name)").or(`client_id.eq.${user!.id},provider_id.eq.${user!.id}`).order("created_at", { ascending: false });
      const rows = b ?? [];
      const clientIds = rows.filter((r) => r.provider_id === user!.id).map((r) => r.client_id);
      const { data: profs } = clientIds.length ? await supabase.from("profiles").select("id, full_name").in("id", clientIds) : { data: [] };
      const { data: unread } = await supabase.from("messages").select("booking_id").is("read_at", null).neq("sender_id", user!.id);
      const names = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
      const u = new Map<string, number>();
      (unread ?? []).forEach((m) => u.set(m.booking_id, (u.get(m.booking_id) ?? 0) + 1));
      return rows.map((r) => ({ ...r, other: r.provider_id === user!.id ? names.get(r.client_id) || "Client" : r.providers?.business_name, unread: u.get(r.id) ?? 0 }));
    },
  });
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title="Messages" subtitle="Une conversation par réservation" />
      <div className="overflow-hidden rounded-2xl border bg-card">
        {data.map((c) => (
          <Link key={c.id} to="/messages/$bookingId" params={{ bookingId: c.id }} className="flex items-center gap-3 border-b p-4 last:border-0 hover:bg-muted">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-primary font-bold text-primary-foreground">{(c.other ?? "?").charAt(0)}</span>
            <div className="flex-1"><b>{c.other}</b><p className="text-sm text-muted-foreground">{c.services?.name} · {new Date(c.date).toLocaleDateString("fr-FR")}</p></div>
            {c.unread > 0 && <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-primary">{c.unread}</span>}
          </Link>
        ))}
        {data.length === 0 && <p className="p-10 text-center text-muted-foreground">Aucune conversation. Elles apparaissent après une réservation.</p>}
      </div>
    </div>
  );
}

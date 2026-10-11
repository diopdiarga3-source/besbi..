import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { PushToggle } from "@/components/PushToggle";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Bës bi" }, { name: "description", content: "Vos notifications." }, { property: "og:title", content: "Notifications — Bës bi" }, { property: "og:description", content: "Notifications." }] }),
  component: Notifs,
});

function Notifs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["notifs", user?.id],
    queryFn: async () => (await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });
  useEffect(() => {
    if (data.some((n) => !n.read))
      supabase.from("notifications").update({ read: true }).eq("user_id", user!.id).eq("read", false).then(() => qc.invalidateQueries({ queryKey: ["unread"] }));
  }, [data, user, qc]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader title="Notifications" />
      <PushToggle />
      <div className="overflow-hidden rounded-2xl border bg-card">
        {data.map((n) => (
          <a key={n.id} href={n.link ?? "#"} className={`block border-b p-4 last:border-0 hover:bg-muted ${!n.read ? "bg-accent/50" : ""}`}>
            <b>{n.title}</b><p className="text-sm text-muted-foreground">{n.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("fr-FR")}</p>
          </a>
        ))}
        {data.length === 0 && <p className="p-10 text-center text-muted-foreground">Aucune notification. <Link to="/" className="underline">Accueil</Link></p>}
      </div>
    </div>
  );
}

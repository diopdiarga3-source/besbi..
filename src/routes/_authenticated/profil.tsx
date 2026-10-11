import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Heart, Briefcase, Shield, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader } from "@/components/AppShell";
import { ProviderCard, providerSelect, type ProviderRow } from "@/components/ProviderCard";
import { errMsg } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/profil")({
  head: () => ({ meta: [{ title: "Mon profil — Bës bi" }, { name: "description", content: "Profil, favoris et paramètres." }, { property: "og:title", content: "Mon profil — Bës bi" }, { property: "og:description", content: "Profil." }] }),
  component: Profile,
});

function Profile() {
  const { user, roles, refreshRoles } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [f, setF] = useState({ full_name: "", phone: "", city: "" });

  const { data } = useQuery({
    queryKey: ["me", user?.id],
    queryFn: async () => {
      const [p, fav] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user!.id).single(),
        supabase.from("favorites").select(`providers(${providerSelect})`).eq("user_id", user!.id),
      ]);
      return { p: p.data, favs: (fav.data ?? []).map((x) => x.providers) as unknown as ProviderRow[] };
    },
  });
  useEffect(() => { if (data?.p) setF({ full_name: data.p.full_name, phone: data.p.phone ?? "", city: data.p.city ?? "" }); }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("profiles").update({ full_name: f.full_name.trim().slice(0, 100), phone: f.phone.trim().slice(0, 20), city: f.city.trim().slice(0, 60) }).eq("id", user!.id);
    if (error) toast.error(errMsg(error)); else { toast.success("Profil mis à jour"); qc.invalidateQueries({ queryKey: ["me"] }); }
  }
  async function becomePro() {
    const { error } = await supabase.rpc("become_provider");
    if (error) { toast.error(errMsg(error)); return; }
    await refreshRoles();
    navigate({ to: "/pro/profil" });
  }
  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const inp = "mt-1 w-full rounded-xl border bg-card px-4 py-2.5";
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader title="Mon profil" subtitle={user?.email} />
      <div className="grid gap-6 md:grid-cols-[1fr_280px]">
        <form onSubmit={save} className="space-y-3 rounded-2xl border bg-card p-5">
          <label className="block text-sm font-semibold">Nom complet<input className={inp} value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} /></label>
          <label className="block text-sm font-semibold">Téléphone<input className={inp} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></label>
          <label className="block text-sm font-semibold">Ville<input className={inp} value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} /></label>
          <button className="rounded-full bg-primary px-6 py-2.5 font-bold text-primary-foreground">Enregistrer</button>
        </form>
        <div className="space-y-2">
          {roles.includes("provider")
            ? <Link to="/pro" className="flex items-center gap-2 rounded-2xl bg-ink p-4 font-bold text-ink-foreground"><Briefcase className="h-5 w-5 text-primary" />Mon espace pro</Link>
            : <button onClick={becomePro} className="flex w-full items-center gap-2 rounded-2xl bg-ink p-4 font-bold text-ink-foreground"><Briefcase className="h-5 w-5 text-primary" />Devenir prestataire</button>}
          {roles.includes("admin") && <Link to="/admin" className="flex items-center gap-2 rounded-2xl border p-4 font-bold"><Shield className="h-5 w-5" />Administration</Link>}
          <button onClick={signOut} className="flex w-full items-center gap-2 rounded-2xl border p-4 font-bold text-destructive"><LogOut className="h-5 w-5" />Se déconnecter</button>
        </div>
      </div>
      <h2 className="mb-4 mt-10 flex items-center gap-2 text-2xl font-extrabold"><Heart className="h-6 w-6 fill-primary text-primary" />Mes favoris</h2>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.favs ?? []).filter(Boolean).map((p) => <ProviderCard key={p.id} p={p} />)}
      </div>
      {data?.favs.length === 0 && <p className="text-muted-foreground">Ajoutez des prestataires en favoris avec le ❤️ sur leur profil.</p>}
    </div>
  );
}

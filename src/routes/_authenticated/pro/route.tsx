import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useMyProvider } from "@/lib/pro";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_authenticated/pro")({
  component: ProLayout,
});

function ProLayout() {
  const { roles, loading } = useAuth();
  const { data: provider, isLoading } = useMyProvider();
  const path = useRouterState({ select: (s) => s.location.pathname });
  if (loading || isLoading) return <div className="p-10 text-center text-muted-foreground">Chargement...</div>;
  if (!roles.includes("provider")) return (
    <div className="mx-auto max-w-md p-10 text-center">
      <p>Cet espace est réservé aux prestataires.</p>
      <Link to="/profil" className="mt-4 inline-block rounded-full bg-primary px-5 py-2 font-bold text-primary-foreground">Devenir prestataire</Link>
    </div>
  );
  if (!provider && path !== "/pro/profil") return (
    <div className="mx-auto max-w-md p-10 text-center">
      <h1 className="text-2xl font-extrabold">Bienvenue ! 👋</h1>
      <p className="mt-2 text-muted-foreground">Créez votre profil professionnel pour recevoir des commandes.</p>
      <Link to="/pro/profil" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground">Créer mon profil pro</Link>
    </div>
  );
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Outlet />
    </div>
  );
}

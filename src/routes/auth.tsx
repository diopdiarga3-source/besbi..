import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ role: z.enum(["client", "provider"]).optional() }),
  head: () => ({
    meta: [
      { title: "Connexion — Bës bi" },
      { name: "description", content: "Connectez-vous ou créez votre compte client ou prestataire." },
      { property: "og:title", content: "Connexion — Bës bi" },
      { property: "og:description", content: "Accédez à votre espace Bës bi." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  full_name: z.string().trim().min(2, "Nom trop court").max(100),
  phone: z.string().trim().regex(/^\+?[0-9 ]{9,15}$/, "Numéro invalide"),
  city: z.string().trim().min(2).max(60),
  email: z.string().trim().email("E-mail invalide").max(255),
  password: z.string().min(8, "8 caractères minimum").max(72),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "Les mots de passe ne correspondent pas", path: ["confirm"] });

function AuthPage() {
  const search = Route.useSearch();
  const { user, roles } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">(search.role ? "signup" : "login");
  const [role, setRole] = useState<"client" | "provider">(search.role ?? "client");
  const [f, setF] = useState({ full_name: "", phone: "", city: "Dakar", email: "", password: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user) navigate({ to: roles.includes("provider") ? "/pro" : "/", replace: true });
  }, [user, roles, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: f.email.trim(), password: f.password });
        if (error) throw error;
      } else {
        const v = signupSchema.safeParse(f);
        if (!v.success) throw new Error(v.error.issues[0]?.message ?? "Formulaire invalide");
        const { error } = await supabase.auth.signUp({
          email: v.data.email, password: v.data.password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: v.data.full_name, phone: v.data.phone, city: v.data.city, role } },
        });
        if (error) throw error;
        setSent(true);
      }
    } catch (err) {
      toast.error((err as Error).message === "Invalid login credentials" ? "E-mail ou mot de passe incorrect" : (err as Error).message);
    } finally { setBusy(false); }
  }

  const inp = "w-full rounded-xl border bg-card px-4 py-3 outline-none focus:border-primary";
  if (sent) return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-3xl font-extrabold">Vérifiez vos e-mails</h1>
      <p className="mt-3 text-muted-foreground">Nous avons envoyé un lien de confirmation à <b>{f.email}</b>. Cliquez dessus pour activer votre compte.</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-3xl font-extrabold">{mode === "login" ? "Bon retour 👋" : "Créer un compte"}</h1>
      <div className="mt-6 grid grid-cols-2 rounded-xl bg-muted p-1 text-sm font-bold">
        {(["login", "signup"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`rounded-lg py-2 ${mode === m ? "bg-ink text-ink-foreground" : ""}`}>{m === "login" ? "Connexion" : "Inscription"}</button>
        ))}
      </div>
      <form onSubmit={submit} className="mt-6 space-y-3">
        {mode === "signup" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {(["client", "provider"] as const).map((r) => (
                <button type="button" key={r} onClick={() => setRole(r)}
                  className={`rounded-xl border-2 p-3 text-left text-sm ${role === r ? "border-primary bg-accent" : ""}`}>
                  <b>{r === "client" ? "Je cherche" : "Je propose"}</b><br />
                  <span className="text-muted-foreground">{r === "client" ? "un prestataire" : "mes services"}</span>
                </button>
              ))}
            </div>
            <input className={inp} placeholder="Nom complet" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} />
            <input className={inp} placeholder="Téléphone (+221 77 000 00 00)" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
            <input className={inp} placeholder="Ville" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} />
          </>
        )}
        <input className={inp} type="email" placeholder="E-mail" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <div className="relative">
          <input className={`${inp} pr-12`} type={showPw ? "text" : "password"} placeholder="Mot de passe" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-lg text-muted-foreground">{showPw ? "🙈" : "👁️"}</button>
        </div>
        {mode === "signup" && (
          <input className={inp} type={showPw ? "text" : "password"} placeholder="Confirmer le mot de passe" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} />
        )}
        <button disabled={busy} className="w-full rounded-xl bg-primary py-3.5 font-bold text-primary-foreground disabled:opacity-60">
          {busy ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
        </button>
      </form>
    </div>
  );
}

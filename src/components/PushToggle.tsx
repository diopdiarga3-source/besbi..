import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { disablePush, enablePush, getPushSubscription, pushSupported } from "@/lib/push";

export function PushToggle() {
  const { user } = useAuth();
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupported(pushSupported());
    void getPushSubscription().then((s) => setOn(!!s)).catch(() => undefined);
  }, []);

  if (!user) return null;

  async function toggle() {
    setBusy(true);
    try {
      if (on) { await disablePush(); setOn(false); toast.success("Alertes désactivées"); }
      else { await enablePush(user!.id); setOn(true); toast.success("Alertes activées sur ce téléphone"); }
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      toast.error(m === "denied" ? "Autorisez les notifications dans les réglages du navigateur." : "Impossible d'activer les alertes ici. Ouvrez Bës bi dans Chrome ou Safari.");
    } finally { setBusy(false); }
  }

  return (
    <div className="mb-4 flex items-center gap-3 rounded-2xl border bg-card p-4">
      <BellRing className="h-6 w-6 shrink-0 text-primary" />
      <div className="flex-1 text-sm">
        <b>Alertes sur le téléphone</b>
        <p className="text-muted-foreground">
          {supported ? "Recevez vos notifications même quand Bës bi est fermé." : "Sur iPhone : ajoutez d'abord Bës bi à l'écran d'accueil (Partager → Sur l'écran d'accueil)."}
        </p>
      </div>
      {supported && (
        <Button size="sm" variant={on ? "outline" : "default"} disabled={busy} onClick={() => void toggle()}>
          {on ? "Désactiver" : "Activer"}
        </Button>
      )}
    </div>
  );
}

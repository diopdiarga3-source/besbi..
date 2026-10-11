import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useMyProvider() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-provider", user?.id],
    enabled: !!user,
    queryFn: async () => (await supabase.from("providers").select("*").eq("id", user!.id).maybeSingle()).data,
  });
}

export function useProBookings() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["pro-bookings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("bookings").select("*, services(name, providers(categories(slug)))").eq("provider_id", user!.id).order("date", { ascending: true });
      const rows = data ?? [];
      const ids = [...new Set(rows.map((r) => r.client_id))];
      const { data: profs } = ids.length ? await supabase.from("profiles").select("id, full_name, phone, city").in("id", ids) : { data: [] };
      const map = new Map((profs ?? []).map((p) => [p.id, p]));
      return rows.map((r) => ({ ...r, client: map.get(r.client_id) }));
    },
  });
}

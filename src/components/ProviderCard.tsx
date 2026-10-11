import { Link } from "@tanstack/react-router";
import { BadgeCheck, MapPin, Star } from "lucide-react";
import { fcfa } from "@/lib/format";

export type ProviderRow = {
  id: string; business_name: string; city: string; cover_url: string | null; avatar_url: string | null;
  verified: boolean; rating_avg: number; reviews_count: number;
  categories: { name: string; emoji: string } | null;
  services: { price: number; active: boolean }[];
};

export const providerSelect =
  "id,business_name,city,cover_url,avatar_url,verified,rating_avg,reviews_count,travel_possible,delivery_available,category_id,categories(name,emoji),services(price,active)";

export function minPrice(p: ProviderRow) {
  const prices = p.services.filter((s) => s.active).map((s) => s.price);
  return prices.length ? Math.min(...prices) : null;
}

export function ProviderCard({ p }: { p: ProviderRow }) {
  const from = minPrice(p);
  return (
    <Link to="/prestataire/$id" params={{ id: p.id }}
      className="group overflow-hidden rounded-2xl border bg-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {p.cover_url && <img src={p.cover_url} alt={p.business_name} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />}
        {p.verified && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-primary">
            <BadgeCheck className="h-3.5 w-3.5" /> Vérifié
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs font-semibold text-muted-foreground">{p.categories?.emoji} {p.categories?.name}</p>
        <h3 className="mt-1 text-lg font-bold">{p.business_name}</h3>
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-4 w-4" />{p.city}</span>
          <span className="flex items-center gap-1 font-bold"><Star className="h-4 w-4 fill-primary text-primary" />{Number(p.rating_avg).toFixed(1)} <span className="font-normal text-muted-foreground">({p.reviews_count})</span></span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <span className="text-sm">{from !== null ? <>À partir de <b>{fcfa(from)}</b></> : "Sur devis"}</span>
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Voir le profil</span>
        </div>
      </div>
    </Link>
  );
}

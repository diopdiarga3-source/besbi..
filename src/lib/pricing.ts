// Prix dynamique — miroir exact du calcul serveur (trigger bookings_before_insert).
export const EVENT_TYPES = ["Mariage", "Baptême", "Anniversaire", "Tour de famille", "Gamou / religieux", "Soirée / gala", "Entreprise", "Autre"] as const;

export type ServiceOption = { label: string; price: number };
export type TravelZone = { city: string; fee: number };
export type PricingService = { price: number; options?: unknown; event_prices?: unknown; guest_price?: number; guests_included?: number };
export type PricingProvider = { travel_possible: boolean; travel_fee: number; travel_zones?: unknown };

export const asOptions = (v: unknown): ServiceOption[] => (Array.isArray(v) ? v.filter((o) => o && typeof o.label === "string").map((o) => ({ label: o.label, price: Number(o.price) || 0 })) : []);
export const asZones = (v: unknown): TravelZone[] => (Array.isArray(v) ? v.filter((z) => z && typeof z.city === "string").map((z) => ({ city: z.city, fee: Number(z.fee) || 0 })) : []);
export const asEventPrices = (v: unknown): Record<string, number> => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, Number(x) || 0])) : {});

export function computePrice(s: PricingService, p: PricingProvider, c: { quantity: number; selected: string[]; eventType?: string | null; guests: number; city?: string | null }) {
  const qty = Math.max(1, Math.min(10000, Math.floor(c.quantity || 1)));
  const guests = Math.max(0, Math.floor(c.guests || 0));
  const options = asOptions(s.options).filter((o) => c.selected.includes(o.label)).reduce((a, o) => a + o.price, 0);
  const event = c.eventType ? asEventPrices(s.event_prices)[c.eventType] ?? 0 : 0;
  const guestFee = Math.max(0, guests - (s.guests_included ?? 0)) * (s.guest_price ?? 0);
  const base = s.price * qty;
  const subtotal = base + options + event + guestFee;
  const city = c.city?.trim().toLowerCase();
  const zone = city ? asZones(p.travel_zones).find((z) => z.city.trim().toLowerCase() === city) : undefined;
  const travel = p.travel_possible ? (zone ? zone.fee : p.travel_fee) : 0;
  return { base, options, event, guestFee, subtotal, travel };
}

import { describe, it, expect } from "vitest";
import { computePrice } from "./pricing";

const s = { price: 10000, options: [{ label: "Fleurs", price: 5000 }, { label: "Lumières", price: 3000 }], event_prices: { Mariage: 20000, Anniversaire: 0 }, guest_price: 100, guests_included: 50 };
const p = { travel_possible: true, travel_fee: 2000, travel_zones: [{ city: "Thiès", fee: 7000 }] };

describe("prix dynamique", () => {
  it("quantité multiplie le prix de base", () => expect(computePrice(s, p, { quantity: 3, selected: [], guests: 0 }).base).toBe(30000));
  it("options cochées s'ajoutent", () => expect(computePrice(s, p, { quantity: 1, selected: ["Fleurs"], guests: 0 }).subtotal).toBe(15000));
  it("le type d'événement change le prix", () => {
    expect(computePrice(s, p, { quantity: 1, selected: [], eventType: "Mariage", guests: 0 }).subtotal).toBe(30000);
    expect(computePrice(s, p, { quantity: 1, selected: [], eventType: "Anniversaire", guests: 0 }).subtotal).toBe(10000);
  });
  it("invités au-delà du nombre inclus sont facturés", () => expect(computePrice(s, p, { quantity: 1, selected: [], guests: 80 }).guestFee).toBe(3000));
  it("déplacement selon la ville, sinon frais par défaut", () => {
    expect(computePrice(s, p, { quantity: 1, selected: [], guests: 0, city: "thiès" }).travel).toBe(7000);
    expect(computePrice(s, p, { quantity: 1, selected: [], guests: 0, city: "Dakar" }).travel).toBe(2000);
  });
});

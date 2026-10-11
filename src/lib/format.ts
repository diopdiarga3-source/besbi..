export const fcfa = (n: number | null | undefined) =>
  `${new Intl.NumberFormat("fr-FR").format(Math.round(n ?? 0))} FCFA`;

export const unitLabel: Record<string, string> = {
  forfait: "forfait", unite: "/ unité", jour: "/ jour", heure: "/ heure",
};

export const statusLabel: Record<string, string> = {
  pending: "En attente", accepted: "Confirmée", rejected: "Refusée", completed: "Terminée", cancelled: "Annulée",
};
export const payLabel: Record<string, string> = {
  unpaid: "Non payé", deposit: "Acompte versé", paid: "Payé", refunded: "Remboursé",
};
export const methodLabel: Record<string, string> = {
  wave: "Wave", orange_money: "Orange Money", free_money: "Free Money", card: "Carte bancaire",
};

export const statusTone: Record<string, string> = {
  pending: "bg-accent text-accent-foreground",
  accepted: "bg-ink text-ink-foreground",
  rejected: "bg-destructive/10 text-destructive",
  completed: "bg-success/15 text-success",
  cancelled: "bg-muted text-muted-foreground",
};

export const errMsg = (e: unknown) =>
  (e as { message?: string })?.message ?? "Une erreur est survenue";

// Paiement intégral (100 %) à la réservation ; Bës bi garde 1 %, le prestataire reçoit 99 %.
export const DEPOSIT_RATE = 1;
export const depositOf = (total: number) => Math.ceil(total * DEPOSIT_RATE);
export const COMMISSION_RATE = 0.01;
export const commissionOf = (total: number) => Math.round(total * COMMISSION_RATE);
export const providerNetOf = (total: number) => total - commissionOf(total);
// Univers réservés à la journée (pas d'heure ni de durée).
export const DAY_ONLY_CATEGORIES = ["materiel", "traiteur", "tailleur"];
export const isDayOnly = (slug: string | null | undefined) => !!slug && DAY_ONLY_CATEGORIES.includes(slug);

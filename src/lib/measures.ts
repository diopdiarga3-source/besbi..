export const MEASURE_KEYS = [
  ["tour_cou", "Tour de cou"], ["epaules", "Largeur d'épaules"], ["tour_poitrine", "Tour de poitrine"],
  ["tour_taille", "Tour de taille"], ["tour_hanches", "Tour de hanches"], ["longueur_bras", "Longueur de bras"],
  ["tour_bras", "Tour de bras"], ["longueur_buste", "Longueur de buste"], ["longueur_jambe", "Longueur de jambe"],
  ["tour_cuisse", "Tour de cuisse"], ["longueur_totale", "Longueur épaule-sol"],
] as const;
export type Measures = Record<string, number | null | string>;

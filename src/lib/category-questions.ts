// Questions personnalisées par catégorie de prestation.
// Affichées dans le formulaire de réservation.

export type CategoryQuestion = {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
  placeholder?: string;
};

// Le type d'événement, le nombre d'invités et la ville sont demandés une seule
// fois dans « Votre événement » : ils ne sont donc jamais répétés ici.
export const CATEGORY_QUESTIONS: Record<string, CategoryQuestion[]> = {
  maquillage: [
    { key: "prestation", label: "Prestation souhaitée", type: "select", options: ["Maquillage", "Coiffure", "Maquillage + coiffure", "Onglerie / henné"] },
    { key: "nombre_personnes", label: "Nombre de personnes à préparer", type: "number" },
    { key: "style", label: "Style souhaité", type: "select", options: ["Naturel", "Glamour", "Traditionnel", "Audacieux"] },
    { key: "a_domicile", label: "À domicile ou au salon ?", type: "select", options: ["À domicile", "Au salon"] },
  ],
  photographe: [
    { key: "prestation", label: "Prestation souhaitée", type: "select", options: ["Photo", "Vidéo", "Photo + vidéo"] },
    { key: "duree", label: "Durée de couverture", type: "select", options: ["Quelques heures", "Demi-journée", "Journée complète", "Plusieurs jours"] },
    { key: "livraison", label: "Livrables attendus", type: "select", options: ["Fichiers numériques", "Numérique + album", "Clip résumé", "Film complet"] },
    { key: "drone", label: "Prises de vue par drone ?", type: "select", options: ["Oui", "Non"] },
  ],
  materiel: [
    { key: "materiel_voulu", label: "Matériel souhaité", type: "select", options: ["Bâches", "Chaises", "Tables & nappes", "Décoration", "Plusieurs éléments"] },
    { key: "emplacement", label: "Emplacement", type: "select", options: ["Salle", "Cour / maison", "Rue", "Extérieur / plage"] },
    { key: "montage", label: "Livraison et installation ?", type: "select", options: ["Livraison + installation", "Livraison seule", "Je récupère moi-même"] },
    { key: "theme", label: "Thème / couleurs", type: "text", placeholder: "Ex : or et blanc" },
  ],
  traiteur: [
    { key: "prestation", label: "Prestation souhaitée", type: "select", options: ["Repas", "Gâteau / pâtisserie", "Repas + pâtisserie", "Cocktail / boissons"] },
    { key: "type_service", label: "Type de service", type: "select", options: ["Buffet", "Service à table", "Cocktail", "Livraison seule"] },
    { key: "plats", label: "Plats souhaités / allergies", type: "text", placeholder: "Ex : thiéboudienne, sans arachide…" },
  ],
  dj: [
    { key: "prestation", label: "Prestation souhaitée", type: "select", options: ["DJ", "Sonorisation", "DJ + sonorisation", "Animation / MC"] },
    { key: "duree_animation", label: "Durée d'animation", type: "select", options: ["Quelques heures", "Soirée complète", "Journée + soirée"] },
    { key: "lieu_sono", label: "Lieu", type: "select", options: ["Intérieur", "Extérieur"] },
    { key: "style_musical", label: "Styles musicaux", type: "text", placeholder: "Ex : mbalax, afrobeat…" },
  ],
  tailleur: [
    { key: "nombre_tenues", label: "Nombre de tenues", type: "number" },
    { key: "tissu", label: "Tissu fourni par qui ?", type: "select", options: ["Je fournis le tissu", "Le tailleur fournit"] },
    { key: "modele", label: "Modèle souhaité", type: "text", placeholder: "Décrivez le modèle…" },
  ],
};

export function questionsForCategory(slug: string | null | undefined): CategoryQuestion[] {
  return CATEGORY_QUESTIONS[slug ?? ""] ?? [];
}

// Résumé texte des réponses, réutilisé dans la fiche commande..
export function requirementsSummary(slug: string | null | undefined, req: Record<string, unknown> | null | undefined): { label: string; value: string }[] {
  if (!req) return [];
  const questions = questionsForCategory(slug);
  const out: { label: string; value: string }[] = [];
  for (const q of questions) {
    const v = req[q.key];
    if (v !== undefined && v !== null && String(v).trim() !== "") out.push({ label: q.label, value: String(v) });
  }
  return out;
}

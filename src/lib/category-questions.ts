// Questions personnalisées par catégorie de prestation.
// Affichées dans le formulaire de réservation.

export type CategoryQuestion = {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
  placeholder?: string;
};

const EVENT_TYPE: CategoryQuestion = {
  key: "type_evenement",
  label: "Type d'événement",
  type: "select",
  options: ["Mariage", "Baptême", "Anniversaire", "Fiançailles", "Soirée d'entreprise", "Autre"],
};

export const CATEGORY_QUESTIONS: Record<string, CategoryQuestion[]> = {
  maquillage: [
    EVENT_TYPE,
    { key: "nombre_personnes", label: "Nombre de personnes à maquiller", type: "number" },
    { key: "style", label: "Style souhaité", type: "select", options: ["Naturel", "Glamour", "Traditionnel", "Audacieux"] },
    { key: "teint", label: "Teint / particularités de la peau", type: "text", placeholder: "Ex : peau sensible, allergies…" },
  ],
  photographe: [
    EVENT_TYPE,
    { key: "duree", label: "Durée de couverture souhaitée", type: "select", options: ["Quelques heures", "Demi-journée", "Journée complète", "Plusieurs jours"] },
    { key: "livraison", label: "Livrables attendus", type: "select", options: ["Photos numériques", "Photos + album", "Photos + album + tirages"] },
    { key: "style_photo", label: "Style de photos", type: "select", options: ["Reportage naturel", "Posé / studio", "Mixte"] },
  ],
  videaste: [
    EVENT_TYPE,
    { key: "duree_film", label: "Format de la vidéo", type: "select", options: ["Clip résumé (3-5 min)", "Film complet", "Clip + film complet"] },
    { key: "drone", label: "Prises de vue par drone ?", type: "select", options: ["Oui", "Non", "À discuter"] },
    { key: "diffusion", label: "Diffusion prévue", type: "select", options: ["Réseaux sociaux", "Projection le jour J", "Souvenir familial"] },
  ],
  chaises: [
    EVENT_TYPE,
    { key: "nombre_invites", label: "Nombre d'invités", type: "number" },
    { key: "type_chaises", label: "Type de chaises", type: "select", options: ["Plastique", "Nappe / habillées", "Chivari / prestige", "Mixte"] },
    { key: "montage", label: "Livraison et installation ?", type: "select", options: ["Livraison + installation", "Livraison seule", "Je récupère moi-même"] },
  ],
  baches: [
    EVENT_TYPE,
    { key: "nombre_invites", label: "Nombre d'invités", type: "number" },
    { key: "surface", label: "Surface à couvrir (si connue)", type: "text", placeholder: "Ex : 10 x 20 m" },
    { key: "emplacement", label: "Emplacement", type: "select", options: ["Cour intérieure", "Rue devant la maison", "Plage", "Terrain ouvert"] },
  ],
  materiel: [
    EVENT_TYPE,
    { key: "materiel_voulu", label: "Matériel souhaité", type: "text", placeholder: "Ex : tables, nappes, vaisselle, podium…" },
    { key: "nombre_invites", label: "Nombre d'invités", type: "number" },
  ],
  vetements: [
    EVENT_TYPE,
    { key: "nombre_tenues", label: "Nombre de tenues", type: "number" },
    { key: "style_tenue", label: "Style recherché", type: "select", options: ["Traditionnel", "Moderne", "Mixte", "Tenues assorties famille"] },
    { key: "tailles", label: "Tailles concernées", type: "text", placeholder: "Ex : 2 adultes M/L, 3 enfants" },
  ],
  decoration: [
    EVENT_TYPE,
    { key: "theme", label: "Thème / couleurs souhaités", type: "text", placeholder: "Ex : or et blanc, champêtre…" },
    { key: "lieu_deco", label: "Lieu à décorer", type: "select", options: ["Salle des fêtes", "Maison / cour", "Extérieur", "Plusieurs lieux"] },
    { key: "budget", label: "Budget indicatif (FCFA)", type: "number" },
  ],
  coiffure: [
    EVENT_TYPE,
    { key: "nombre_personnes", label: "Nombre de personnes à coiffer", type: "number" },
    { key: "style_coiffure", label: "Style souhaité", type: "select", options: ["Tresses", "Chignon mariée", "Défrisage / brushing", "Coiffure naturelle", "À discuter"] },
    { key: "a_domicile", label: "À domicile ou au salon ?", type: "select", options: ["À domicile", "Au salon", "Les deux"] },
  ],
  patisserie: [
    EVENT_TYPE,
    { key: "nombre_parts", label: "Nombre de parts / invités", type: "number" },
    { key: "type_gateau", label: "Type de gâteau", type: "select", options: ["Pièce montée", "Wedding cake", "Gâteau d'anniversaire", "Mignardises / buffet sucré"] },
    { key: "parfums", label: "Parfums / allergies", type: "text", placeholder: "Ex : chocolat-vanille, sans arachide…" },
  ],
  traiteur: [
    EVENT_TYPE,
    { key: "nombre_invites", label: "Nombre d'invités", type: "number" },
    { key: "type_service", label: "Type de service", type: "select", options: ["Buffet", "Service à table", "Cocktail", "Plats à emporter"] },
    { key: "plats", label: "Plats souhaités / régimes", type: "text", placeholder: "Ex : thiéboudienne, yassa, options végétariennes…" },
  ],
  vehicules: [
    EVENT_TYPE,
    { key: "type_vehicule", label: "Type de véhicule", type: "select", options: ["Voiture de prestige", "4x4", "Minibus", "Cortège complet"] },
    { key: "trajet", label: "Trajet prévu", type: "text", placeholder: "Ex : Dakar → Touba aller-retour" },
    { key: "chauffeur", label: "Avec chauffeur ?", type: "select", options: ["Oui", "Non"] },
  ],
  dj: [
    EVENT_TYPE,
    { key: "style_musical", label: "Styles musicaux", type: "text", placeholder: "Ex : mbalax, afrobeat, variété internationale…" },
    { key: "duree_animation", label: "Durée d'animation", type: "select", options: ["Quelques heures", "Soirée complète", "Journée + soirée"] },
    { key: "sono_incluse", label: "Besoin de la sonorisation ?", type: "select", options: ["Oui, tout inclus", "Non, sono déjà sur place"] },
  ],
  sonorisation: [
    EVENT_TYPE,
    { key: "nombre_invites", label: "Nombre d'invités", type: "number" },
    { key: "lieu_sono", label: "Lieu", type: "select", options: ["Intérieur", "Extérieur", "Les deux"] },
    { key: "besoins", label: "Besoins particuliers", type: "text", placeholder: "Ex : éclairage, micros, écran, groupe électrogène…" },
  ],
  mariage: [
    { key: "date_prevue", label: "Date ou période envisagée", type: "text", placeholder: "Ex : décembre 2026" },
    { key: "nombre_invites", label: "Nombre d'invités estimé", type: "number" },
    { key: "budget", label: "Budget global indicatif (FCFA)", type: "number" },
    { key: "accompagnement", label: "Niveau d'accompagnement", type: "select", options: ["Organisation complète", "Coordination jour J", "Conseils ponctuels"] },
  ],
  salles: [
    EVENT_TYPE,
    { key: "nombre_invites", label: "Nombre d'invités", type: "number" },
    { key: "equipements", label: "Équipements nécessaires", type: "text", placeholder: "Ex : climatisation, cuisine, parking, scène…" },
  ],
  tailleur: [
    { key: "tissu", label: "Tissu fourni par qui ?", type: "select", options: ["Je fournis le tissu", "Le tailleur fournit", "À discuter"] },
    { key: "modele", label: "Modèle souhaité", type: "text", placeholder: "Décrivez le modèle ou la référence…" },
    { key: "occasion", label: "Occasion", type: "select", options: ["Mariage", "Baptême", "Tabaski / fête religieuse", "Quotidien", "Autre"] },
  ],
  autres: [
    { key: "besoin", label: "Décrivez votre besoin", type: "text", placeholder: "Expliquez ce que vous attendez…" },
    { key: "nombre_invites", label: "Nombre de personnes concernées", type: "number" },
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

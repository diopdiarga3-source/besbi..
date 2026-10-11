CREATE TABLE public.service_catalog (
  id uuid not null default gen_random_uuid() primary key,
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  description text not null default '',
  price integer not null default 0,
  unit text not null default 'forfait',
  duration_minutes integer not null default 60,
  sort integer not null default 0
);
GRANT SELECT ON public.service_catalog TO anon, authenticated;
GRANT ALL ON public.service_catalog TO service_role;
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "catalog public read" ON public.service_catalog FOR SELECT USING (true);
CREATE POLICY "catalog admin manage" ON public.service_catalog FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.service_catalog (category_id, name, description, price, unit, duration_minutes, sort) VALUES
-- Maquillage
('62fc25e7-99c9-4349-b96e-e806b6ce4f49','Maquillage mariée','Maquillage complet de la mariée avec essai',50000,'forfait',120,1),
('62fc25e7-99c9-4349-b96e-e806b6ce4f49','Maquillage invitée / soirée','Maquillage simple pour invitée ou soirée',15000,'forfait',60,2),
('62fc25e7-99c9-4349-b96e-e806b6ce4f49','Maquillage shooting photo','Maquillage adapté aux séances photo',20000,'forfait',60,3),
('62fc25e7-99c9-4349-b96e-e806b6ce4f49','Cours d''auto-maquillage','Apprenez à vous maquiller vous-même',25000,'forfait',120,4),
-- Photographe
('34bc6d5c-6934-4029-bb62-ca33402627eb','Reportage mariage (journée)','Couverture photo complète du mariage',150000,'jour',480,1),
('34bc6d5c-6934-4029-bb62-ca33402627eb','Shooting portrait / famille','Séance photo en studio ou extérieur',25000,'forfait',90,2),
('34bc6d5c-6934-4029-bb62-ca33402627eb','Shooting grossesse / nouveau-né','Séance photo dédiée',30000,'forfait',90,3),
('34bc6d5c-6934-4029-bb62-ca33402627eb','Couverture baptême / anniversaire','Photos de votre événement',60000,'forfait',240,4),
-- Vidéaste
('77ec1f78-f905-493f-993f-02fe174692f2','Film de mariage','Vidéo complète avec montage',200000,'forfait',480,1),
('77ec1f78-f905-493f-993f-02fe174692f2','Clip événementiel (teaser)','Courte vidéo résumé de l''événement',75000,'forfait',240,2),
('77ec1f78-f905-493f-993f-02fe174692f2','Vidéo publicitaire / institutionnelle','Vidéo pour entreprise ou marque',150000,'forfait',300,3),
-- Location de chaises
('70f82361-bbb2-4953-9739-15527c00377d','Chaise simple','Location de chaise standard',300,'unite',1440,1),
('70f82361-bbb2-4953-9739-15527c00377d','Chaise décorée (noeud/housse)','Chaise avec housse et décoration',700,'unite',1440,2),
('70f82361-bbb2-4953-9739-15527c00377d','Table + 6 chaises','Ensemble table et chaises',5000,'unite',1440,3),
-- Location de bâches
('a62dafe3-6d40-4924-838b-47e2a218a122','Bâche 50 places','Location de bâche avec installation',40000,'jour',1440,1),
('a62dafe3-6d40-4924-838b-47e2a218a122','Bâche 100 places','Location de bâche avec installation',70000,'jour',1440,2),
('a62dafe3-6d40-4924-838b-47e2a218a122','Bâche 200 places','Location de bâche avec installation',120000,'jour',1440,3),
-- Matériel événementiel
('88849028-0fa0-43d5-8e98-7d5cadd3ee65','Groupe électrogène','Location groupe électrogène avec carburant',25000,'jour',1440,1),
('88849028-0fa0-43d5-8e98-7d5cadd3ee65','Éclairage événementiel','Jeux de lumières et projecteurs',40000,'jour',1440,2),
('88849028-0fa0-43d5-8e98-7d5cadd3ee65','Scène + podium','Location de scène modulable',80000,'jour',1440,3),
-- Location de vêtements
('d6db3091-088b-4833-bc89-45f63bf88a21','Robe de mariée','Location robe de mariée',100000,'jour',1440,1),
('d6db3091-088b-4833-bc89-45f63bf88a21','Costume homme','Location costume complet',30000,'jour',1440,2),
('d6db3091-088b-4833-bc89-45f63bf88a21','Tenue traditionnelle (boubou grand)','Location tenue traditionnelle',25000,'jour',1440,3),
-- Décoration
('bb2e5866-0eb1-427c-8185-3b7900021ac7','Décoration salle de mariage','Décoration complète de la salle',200000,'forfait',300,1),
('bb2e5866-0eb1-427c-8185-3b7900021ac7','Arche de ballons','Arche décorative pour entrée ou photos',35000,'forfait',120,2),
('bb2e5866-0eb1-427c-8185-3b7900021ac7','Décoration table d''honneur','Mise en valeur de la table des mariés',50000,'forfait',120,3),
-- Coiffure
('e2bb2eb1-d5c9-4aae-87a1-f17788dba2cd','Coiffure mariée','Coiffure complète de la mariée',30000,'forfait',120,1),
('e2bb2eb1-d5c9-4aae-87a1-f17788dba2cd','Tresses / vanilles','Pose de tresses africaines',10000,'forfait',180,2),
('e2bb2eb1-d5c9-4aae-87a1-f17788dba2cd','Pose de perruque / tissage','Pose et coiffage',15000,'forfait',120,3),
('e2bb2eb1-d5c9-4aae-87a1-f17788dba2cd','Coupe homme à domicile','Déplacement inclus',5000,'forfait',45,4),
-- Gâteaux & pâtisserie
('8bf403c0-1c9d-4400-9067-700adf886d37','Gâteau de mariage (3 étages)','Pièce montée personnalisée',80000,'forfait',0,1),
('8bf403c0-1c9d-4400-9067-700adf886d37','Gâteau d''anniversaire','Gâteau personnalisé sur commande',15000,'forfait',0,2),
('8bf403c0-1c9d-4400-9067-700adf886d37','Assortiment de petits fours','Plateau de 50 pièces',20000,'forfait',0,3),
-- Traiteur
('0521d957-9cfb-438b-908d-15b61743fefe','Buffet complet (par personne)','Repas complet servi en buffet',5000,'unite',240,1),
('0521d957-9cfb-438b-908d-15b61743fefe','Thiéboudienne / plat traditionnel','Plat pour 10 personnes',25000,'forfait',180,2),
('0521d957-9cfb-438b-908d-15b61743fefe','Service boissons & jus naturels','Jus locaux (bissap, bouye, gingembre)',1500,'unite',120,3),
-- Location de véhicules
('1ec3ec86-77b9-42aa-a900-2442e4d78887','Voiture de mariage avec chauffeur','Véhicule décoré avec chauffeur',75000,'jour',480,1),
('1ec3ec86-77b9-42aa-a900-2442e4d78887','Minibus pour invités','Transport de vos invités',50000,'jour',480,2),
('1ec3ec86-77b9-42aa-a900-2442e4d78887','Location voiture simple (sans chauffeur)','Location à la journée',30000,'jour',1440,3),
-- DJ & animation
('028756b3-197a-4de7-a097-25327f8d895f','DJ soirée complète','Prestation DJ avec playlist personnalisée',100000,'forfait',300,1),
('028756b3-197a-4de7-a097-25327f8d895f','Animateur / MC','Animation de votre cérémonie',60000,'forfait',240,2),
('028756b3-197a-4de7-a097-25327f8d895f','Orchestre / groupe live','Musiciens en direct',200000,'forfait',240,3),
-- Sonorisation
('e0ab0ffc-b4b9-4114-8ef9-887c5b4af9de','Pack sono petite salle','Enceintes + micros + régie',40000,'jour',1440,1),
('e0ab0ffc-b4b9-4114-8ef9-887c5b4af9de','Pack sono grande salle / plein air','Système complet avec technicien',100000,'jour',1440,2),
('e0ab0ffc-b4b9-4114-8ef9-887c5b4af9de','Micros sans fil (location)','Location à l''unité',5000,'unite',1440,3),
-- Pack événementiel
('e53c2460-a61a-4151-a0f6-b227ecab0a2a','Organisation complète de mariage','De la planification au jour J',500000,'forfait',0,1),
('e53c2460-a61a-4151-a0f6-b227ecab0a2a','Coordination jour J','Présence et coordination le jour de l''événement',150000,'forfait',480,2),
('e53c2460-a61a-4151-a0f6-b227ecab0a2a','Organisation baptême / anniversaire','Organisation clé en main',200000,'forfait',0,3),
-- Location de salles
('74de60c9-af11-48b3-ab84-a11a74d2f35d','Salle des fêtes (journée)','Location de salle climatisée',150000,'jour',1440,1),
('74de60c9-af11-48b3-ab84-a11a74d2f35d','Salle de réunion / conférence','Location à la demi-journée',50000,'jour',720,2),
('74de60c9-af11-48b3-ab84-a11a74d2f35d','Jardin / espace extérieur','Espace pour cérémonies en plein air',100000,'jour',1440,3),
-- Autres services
('02db3c12-0e33-43e5-8ee3-8e7c120e16c2','Service personnalisé','Décrivez votre prestation',0,'forfait',60,1);
DO $$
DECLARE m record;
BEGIN
  FOR m IN SELECT * FROM (VALUES
    ('chaises','materiel'),('baches','materiel'),('decoration','materiel'),('mariage','materiel'),('salles','materiel'),('vehicules','materiel'),('autres','materiel'),
    ('coiffure','maquillage'),('videaste','photographe'),('patisserie','traiteur'),('sonorisation','dj'),('vetements','tailleur')
  ) AS t(src,dst) LOOP
    UPDATE public.providers SET category_id=(SELECT id FROM public.categories WHERE slug=m.dst)
      WHERE category_id=(SELECT id FROM public.categories WHERE slug=m.src);
    IF m.src NOT IN ('mariage','salles','vehicules','autres') THEN
      UPDATE public.service_catalog SET category_id=(SELECT id FROM public.categories WHERE slug=m.dst), sort=sort+100
        WHERE category_id=(SELECT id FROM public.categories WHERE slug=m.src);
    END IF;
  END LOOP;
END $$;

DELETE FROM public.categories WHERE slug IN ('chaises','baches','decoration','mariage','salles','vehicules','autres','coiffure','videaste','patisserie','sonorisation','vetements');

UPDATE public.categories SET name='Beauté & Coiffure', emoji='💄', sort=1 WHERE slug='maquillage';
UPDATE public.categories SET name='Matériel & Décoration', emoji='🎪', sort=2 WHERE slug='materiel';
UPDATE public.categories SET name='Photo & Vidéo', emoji='📸', sort=3 WHERE slug='photographe';
UPDATE public.categories SET name='Traiteur & Pâtisserie', emoji='🍽️', sort=4 WHERE slug='traiteur';
UPDATE public.categories SET name='Sonorisation & DJ', emoji='🎤', sort=5 WHERE slug='dj';
UPDATE public.categories SET name='Mode & Couture', emoji='🧵', sort=6 WHERE slug='tailleur';

DELETE FROM public.service_catalog a USING public.service_catalog b
  WHERE a.category_id=b.category_id AND lower(a.name)=lower(b.name) AND a.id>b.id;

INSERT INTO public.service_catalog (category_id,name,description,unit,sort)
SELECT c.id, v.name, v.descr, 'forfait', 200+v.n FROM public.categories c JOIN (VALUES
 ('traiteur','Thiéboudienne de fête','Grand plat de riz au poisson pour vos invités',1),
 ('traiteur','Yassa poulet fermier','Poulet mariné aux oignons et citron',2),
 ('traiteur','Dibi d''agneau & grillades','Grillades braisées sur place',3),
 ('traiteur','Bar à jus locaux','Bissap, bouye, tamarin, gingembre',4),
 ('traiteur','Service de serveurs','Serveurs et maîtres d''hôtel pour la réception',5),
 ('dj','Fumée lourde ouverture de bal','Effet nuage pour l''entrée des mariés',1),
 ('dj','Maître de cérémonie / griot','Animation traditionnelle de la cérémonie',2),
 ('dj','Sonorisation extérieure cour/rue','Sono adaptée aux grands espaces ouverts',3),
 ('dj','Playlist personnalisée','Mbalax, afrobeat, variétés selon vos goûts',4),
 ('tailleur','Grand boubou 3 pièces brodé','Confection brodée main',1),
 ('tailleur','Tenues assorties couple / famille','Ensembles coordonnés pour la cérémonie',2),
 ('tailleur','Retouches express','Ajustements rapides avant l''événement',3),
 ('tailleur','Prise de mesures à domicile','Le tailleur se déplace chez vous',4)
) v(slug,name,descr,n) ON c.slug=v.slug
WHERE NOT EXISTS (SELECT 1 FROM public.service_catalog s WHERE s.category_id=c.id AND lower(s.name)=lower(v.name));

UPDATE public.service_catalog SET price=0;

-- Réservations à la journée (sans heure) : 00:00 n'est pas soumis au créneau unique
DROP INDEX IF EXISTS public.bookings_slot_unique;
CREATE UNIQUE INDEX bookings_slot_unique ON public.bookings (provider_id, date, start_time)
  WHERE status IN ('pending','accepted') AND start_time <> '00:00';

-- Suivi des reversements au prestataire (admin)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payout_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_done_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_payout_done(_booking uuid, _done boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Accès refusé'; END IF;
  UPDATE public.bookings SET payout_status = CASE WHEN _done THEN 'done' ELSE 'pending' END,
    payout_done_at = CASE WHEN _done THEN now() ELSE NULL END WHERE id=_booking;
END $$;
REVOKE ALL ON FUNCTION public.mark_payout_done(uuid,boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_payout_done(uuid,boolean) TO authenticated;
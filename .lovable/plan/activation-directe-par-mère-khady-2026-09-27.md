# Activation directe par Mère Khady

## Résultat attendu
- Une demande explicite de localisation déclenche immédiatement la demande d’autorisation du téléphone, puis enregistre la position.
- Une demande explicite de paiement lance directement le paiement après que le client a indiqué Wave, Orange Money, Free Money ou carte, ainsi que l’acompte ou le total.
- Mère Khady n’affirme plus qu’elle ne peut pas agir : elle explique seulement les autorisations obligatoires du téléphone ou de l’opérateur.

## Mise en œuvre
- Enrichir les actions de Mère Khady avec un indicateur d’exécution immédiate et les choix du paiement.
- Déclencher ces actions une seule fois dans la conversation, sans relancer une ancienne action lors du rechargement.
- Conserver les boutons comme solution de reprise si une autorisation est refusée ou si un choix manque.
- Vérifier la conversation sur ordinateur et téléphone, ainsi que l’absence d’erreurs.

## Limites obligatoires
- Le navigateur doit toujours afficher sa propre demande d’autorisation GPS ; l’application ne peut pas l’accepter à la place du client.
- Wave, Orange Money ou la carte peuvent toujours demander leur confirmation de sécurité.

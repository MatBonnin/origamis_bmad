# Specification Fonctionnelle Web - Orig'amis (AMI)

## 1. Objectif du document

Definir les fonctionnalites necessaires du site web AMI (Orig'amis), avec un niveau de detail exploitable pour:
- conception produit,
- priorisation MVP,
- implementation front/back.

Basee sur le document source: `docs/Dossier final Orig'amis M2.pdf` (notamment sections UX/UI, business model, architecture et securite).

## 2. Positionnement produit a respecter

- Cible principale: etudiants du superieur (licence, master, ecoles), en particulier sur projets longs (memoire, alternance, soutenance, examens).
- Cible secondaire: mentors (etudiants avances, jeunes diplomes, doctorants, professionnels).
- Valeur centrale: accompagnement structure dans la duree (pas seulement des cours ponctuels).
- Principe cle: IA en support du mentorat humain (pas en remplacement).

## 3. Roles et permissions

### 3.1 Roles
- `etudiant`
- `mentor`
- `admin`
- `support`

### 3.2 Matrice fonctionnelle (vue macro)
- Etudiant: onboarding, recherche mentor, reservation, messagerie, suivi de projet, progression, avis, incidents, abonnement premium.
- Mentor: profil mentor, disponibilites, reponse aux demandes, sessions, suivi et feedback etudiant, gestion des incidents.
- Admin: moderation, gestion utilisateurs, gestion contenus et signalements, supervision des reservations, pilotage KPI.
- Support: traitement incidents, assistance transactionnelle et utilisateur.

## 4. Fonctionnalites coeur (obligatoires)

### 4.1 Comptes, authentification, profil
- Inscription / connexion securisee (JWT, hash bcrypt, validation stricte des donnees).
- Recuperation de mot de passe.
- Gestion du profil utilisateur:
  - Etudiant: formation, type de projet, echeances, besoins (methodologie, relecture, cadrage, organisation...).
  - Mentor: expertise, methodologie d'accompagnement, disponibilites, tarification.
- Gestion des roles et controles d'acces (RBAC).

### 4.2 Onboarding personnalise
- Parcours d'arrivee etudiant:
  - collecte du contexte academique,
  - definition d'objectifs,
  - qualification du besoin de mentorat,
  - orientation vers dashboard.
- Parcours d'arrivee mentor:
  - creation de profil expert,
  - disponibilites,
  - cadre d'intervention.

### 4.3 Matching et decouverte mentors
- Catalogue mentors consultable (avec pages propres indexables SEO).
- Filtres de recherche minimum:
  - domaine/discipline,
  - type de besoin,
  - disponibilite,
  - format d'accompagnement,
  - budget/tarif.
- Systeme de recommandation:
  - V1: matching par filtres + score de pertinence.
  - V2: matching intelligent assiste IA.
- Consultation detaillee des profils mentors et comparaison.

### 4.4 Demande d'accompagnement et reservations
- Envoi d'une demande de suivi a un mentor.
- Acceptation/refus cote mentor.
- Gestion des creneaux.
- Prise de rendez-vous.
- Historique des reservations.
- Statuts de session (planifiee, terminee, annulee, no-show).

### 4.5 Messagerie et echanges
- Messagerie etudiant <-> mentor.
- Temps reel (WebSocket).
- Historisation des echanges.
- Cadre minimum de moderation/signalement.

### 4.6 Sessions d'accompagnement
- Session en visio ou echange asynchrone structure.
- Compte-rendu post-session.
- Feedback mentor sur les prochaines actions.
- Liaison session <-> objectifs/taches projet.

### 4.7 Suivi de projet et progression (differenciant majeur)
- Tableau de bord etudiant avec:
  - vue globale du suivi,
  - indicateur d'avancement,
  - prochaines echeances,
  - alertes de retard.
- Gestion des objectifs et etapes:
  - creation/mise a jour de parcours,
  - taches associees,
  - validation des etapes franchies.
- Vues d'organisation:
  - liste,
  - calendrier,
  - kanban.
- Synchronisation agenda / deadlines (minimum import-export calendrier en V1.1).
- Suivi post-session:
  - actions a faire,
  - suivi des corrections,
  - mesure de progression.

### 4.8 Avis, notation, confiance
- Evaluation mentor par etudiant apres session.
- Notes + commentaire.
- Affichage maitrise des avis sur profils mentors.

### 4.9 Incidents et support
- Signalement d'incident (comportement, qualite, technique, paiement).
- Ticket de support.
- Workflow interne admin/support (statuts, priorites, resolution).

### 4.10 Paiement, commission, abonnement
- Encaissement des seances.
- Commission plateforme (15% au lancement).
- Suivi des transactions.
- Mecanismes de securisation des paiements.
- Abonnement premium optionnel etudiant (jalons, suivi structure, fonctionnalites IA educatives).

## 5. Fonctionnalites IA (cibles)

### 5.1 IA prioritaire (V1+)
- Assistance au matching (a minima scoring).
- Compte-rendu de session assiste.

### 5.2 IA evolutive (V2)
- Transcription et replay des sessions.
- Generation de quiz et supports de revision.
- Feedback motivationnel et auto-evaluation reguliere.

## 6. Back-office (admin/support)
- Gestion des utilisateurs et roles.
- Verification/activation profils mentors.
- Supervision reservations et litiges.
- Gestion des avis et moderation.
- Traitement des incidents.
- Tableau KPI:
  - nombre de cours,
  - taux conversion onboarding -> premiere session,
  - retention etudiant/mentor,
  - NPS ou satisfaction,
  - revenus commission + premium.

## 7. Exigences non fonctionnelles

### 7.1 Securite
- Auth JWT stateless.
- Hash mots de passe bcrypt + salt.
- Validation stricte DTO sur toutes les entrees.
- Protection injections/XSS/CSRF (selon architecture choisie).
- Journalisation des actions sensibles.

### 7.2 RGPD et conformite
- Donnees hebergees en UE.
- Collecte minimale.
- Consentement et politique de confidentialite.
- Droit d'acces/suppression.
- CGU, contrats mentors, cadre anti-ghostwriting.

### 7.3 Performance et disponibilite
- UX fluide sur desktop + mobile web.
- Optimisation chargement pages publiques mentors (SEO + perf).
- Architecture modulaire evolutive (front/API/DB).

### 7.4 Accessibilite
- Contrastes suffisants.
- Composants interactifs identifiables.
- Navigation claire.
- Parcours critiques utilisables clavier.

## 8. Fonctionnalites explicitement de-priorisees
- Les "fiches de cours" generalistes ont ete retirees du scope prioritaire pour recentrer la proposition de valeur sur:
  - onboarding personnalise,
  - recherche/relation mentor,
  - messagerie,
  - suivi de projet.

## 9. Critere de reussite fonctionnelle (definition de pret-a-lancer V1)
La V1 est consideree "pretable au lancement" si:
- un etudiant peut s'inscrire, definir son besoin, trouver un mentor, reserver, echanger, etre accompagne et suivre sa progression,
- un mentor peut gerer son profil/disponibilites, accepter une demande, accompagner et produire un feedback,
- l'admin/support peut traiter incidents et moderer la plateforme,
- le paiement/commission est operationnel et securise,
- les exigences de base securite + RGPD sont en place.

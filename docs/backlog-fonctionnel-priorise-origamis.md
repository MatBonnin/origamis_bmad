# Backlog Fonctionnel Priorise - Orig'amis

## 1. Regle de priorisation
- `P0 - Must`: indispensable au lancement.
- `P1 - Should`: tres important, peut arriver juste apres lancement.
- `P2 - Could`: valeur ajoutee, pas bloquant pour V1.

## 2. Backlog par epics

### Epic A - Authentification et comptes
- `P0` Inscription, connexion, deconnexion.
- `P0` Hash mot de passe + validation des champs.
- `P0` Gestion des roles (etudiant, mentor, admin, support).
- `P1` Recuperation mot de passe.
- `P1` Verification email.

### Epic B - Onboarding et profilage
- `P0` Onboarding etudiant (formation, projet, echeances, besoins).
- `P0` Onboarding mentor (expertise, disponibilites, methode).
- `P0` Profil editable pour chaque role.
- `P1` Wizard progressif avec score de completion.

### Epic C - Matching et decouverte mentors
- `P0` Listing mentors avec filtres.
- `P0` Page detail mentor.
- `P0` Demande d'accompagnement.
- `P1` Classement des mentors par pertinence.
- `P2` Matching IA avance.

### Epic D - Reservations et sessions
- `P0` Gestion creneaux mentor.
- `P0` Prise de rendez-vous et confirmation.
- `P0` Historique et statuts de reservation.
- `P1` Annulation/reprogrammation avec regles.
- `P1` No-show et traces de session.

### Epic E - Messagerie
- `P0` Messagerie entre etudiant et mentor.
- `P0` Historique conversations.
- `P1` Temps reel (WebSocket) complet.
- `P1` Notifications in-app.

### Epic F - Suivi de projet et progression
- `P0` Dashboard etudiant (indicateur d'avancement + prochaines echeances).
- `P0` Gestion objectifs et etapes.
- `P0` Vues liste / calendrier.
- `P1` Vue kanban.
- `P1` Rappels et alertes echeances.
- `P1` Synchronisation agenda externe.

### Epic G - Feedback et qualite
- `P0` Avis et notation des mentors apres session.
- `P1` Feedback structure mentor -> etudiant post-session.
- `P1` Analyse satisfaction (metriques simples).

### Epic H - Incidents et support
- `P0` Signalement incident.
- `P0` Console support/admin de traitement incidents.
- `P1` SLA internes + priorisation.

### Epic I - Paiements et monetisation
- `P0` Paiement des sessions.
- `P0` Calcul de commission plateforme (15% lancement).
- `P0` Historique transactions.
- `P1` Abonnement premium etudiant.
- `P1` Facturation/recus.

### Epic J - IA educative
- `P1` Compte-rendu assiste IA post-session.
- `P2` Transcription + replay.
- `P2` Generation quiz et fiches revision.
- `P2` Auto-evaluation et feedback motivationnel.

### Epic K - Administration et pilotage
- `P0` Gestion utilisateurs/roles.
- `P0` Moderation avis/signalements.
- `P1` Tableau de bord KPI operationnels.
- `P1` Export donnees de suivi.

## 3. Decoupage release recommande

### Release MVP (0-3 mois)
- Epics A, B, C, D, E (version de base), F (base), G (base), H (base), I (base), K (base).

### Release V1.1 (4-6 mois)
- Matching plus fin.
- Synchronisation agenda.
- Avis/notation enrichis.
- Support client outille.
- Debut IA (compte-rendu).

### Release V1.2 (7-12 mois)
- KPI avances.
- Optimisations conversion/retention.
- Durcissement securite et scalabilite.

### Release V2 (12+ mois)
- IA etendue (transcription, replay, quiz).
- Amelioration matching IA.
- Evolutions B2B (si confirmees par la traction).

## 4. User stories critiques a couvrir en priorite
- En tant qu'etudiant, je peux trouver un mentor adapte et reserver un premier rendez-vous rapidement.
- En tant qu'etudiant, je peux suivre mes objectifs, mes taches et mes echeances depuis un tableau de bord unique.
- En tant que mentor, je peux accepter une demande, echanger avec l'etudiant et structurer son suivi.
- En tant qu'admin/support, je peux gerer incidents, moderation et utilisateurs pour garder la plateforme fiable.
- En tant qu'entreprise, je peux monetiser de facon claire via commission + premium optionnel.

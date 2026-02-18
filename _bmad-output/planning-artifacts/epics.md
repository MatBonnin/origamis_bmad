---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []---

# Orig'ami - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Orig'ami, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Les utilisateurs peuvent créer un compte et se connecter.
FR2: Les utilisateurs peuvent récupérer leur mot de passe.
FR3: Les utilisateurs peuvent gérer leur profil (infos, niveau, objectifs).
FR4: Le système gère des rôles distincts (étudiant, mentor, admin, support).
FR5: Les utilisateurs peuvent gérer leurs préférences de notifications.
FR6: Les étudiants peuvent compléter un onboarding guidé (diplôme, besoins, contexte).
FR7: Le système peut proposer un profil type basé sur les réponses d’onboarding.
FR8: Les étudiants peuvent modifier leurs besoins après onboarding.
FR9: Le système propose des mentors/recommandations personnalisées.
FR10: Les étudiants peuvent rechercher et filtrer des mentors.
FR11: Les étudiants peuvent consulter un profil mentor détaillé.
FR12: Les mentors peuvent définir leur expertise et tarifs.
FR13: Les étudiants peuvent contacter un mentor via messagerie.
FR14: Les mentors peuvent répondre et suivre les échanges.
FR15: Le système envoie des notifications liées aux messages et rendez-vous.
FR16: Les mentors peuvent définir leurs disponibilités via un agenda.
FR17: Les étudiants peuvent réserver un rendez-vous.
FR18: Le système gère l’annulation et le report d’un rendez-vous.
FR19: Le système permet l’accès à une session visio ou un lien externe.
FR20: Les utilisateurs peuvent consulter l’historique des sessions.
FR21: Le système propose un parcours de suivi avec jalons.
FR22: Les étudiants peuvent marquer un jalon comme terminé.
FR23: Les mentors peuvent suivre l’avancement d’un étudiant.
FR24: Les étudiants peuvent publier et répondre dans la communauté.
FR25: Les utilisateurs peuvent signaler un contenu ou un comportement.
FR26: Les admins peuvent modérer les contenus signalés.
FR27: Les étudiants peuvent laisser un avis sur un mentor.
FR28: Les admins peuvent vérifier/valider un profil mentor.
FR29: Les admins peuvent gérer les comptes et rôles.
FR30: Les admins peuvent gérer les mentors (validation, visibilité).
FR31: Le support peut consulter les incidents liés aux sessions.
FR32: Le système fournit des tableaux de bord de base (matching, usage).
FR33: Le système gère le consentement des données personnelles.
FR34: Les utilisateurs peuvent demander la suppression de leurs données.

### NonFunctional Requirements

NFR1: 95% des pages publiques se chargent en < 3s sur réseau standard.
NFR2: Actions clés (recherche mentor, envoi message, prise de RDV) répondent en < 2s.
NFR3: Données sensibles chiffrées en transit (TLS) et au repos.
NFR4: Contrôle d’accès basé sur rôles.
NFR5: Journalisation des actions sensibles.
NFR6: Support d’une croissance x10 d’utilisateurs sans refonte majeure.
NFR7: Support des pics de trafic (inscriptions/rentrée) sans dégradation critique.
NFR8: Conformité cible WCAG 2.1 AA.
NFR9: Navigation clavier complète, contrastes suffisants, labels lisibles.
NFR10: Disponibilité cible 99.5% mensuelle.
NFR11: Restauration en cas d’incident critique < 24h (objectif).
NFR12: Capacité d’intégrer un service de visio externe via lien sécurisé.

### Additional Requirements

- Starter: Next.js (front) + NestJS (API) en monorepo
- Base de donnees: PostgreSQL 17 + Prisma 7.2.0 (migrations Prisma)
- Auth: NextAuth 4.24.13 + JWT + RBAC (etudiant/mentor/admin/support)
- API: REST + OpenAPI/Swagger + WebSocket Nest
- Frontend: Zustand 5.0.10, React Hook Form 7.71.1, TanStack Query 5.90.18
- Conventions: snake_case en DB, camelCase en JSON, enveloppe API {data, error}
- UX: responsive desktop/tablette/mobile
- UX: accessibilite WCAG 2.1 AA
- UX: pages publiques SEO (SSR/SSG)
- UX: dashboard comme point d’ancrage + cartes + CTA unique
- Temps reel: messagerie + notifications
- Deploiement final differe (local-first)

### FR Coverage Map

### FR Coverage Map

FR1: Epic 1 - Compte et authentification
FR2: Epic 1 - Recuperation mot de passe
FR3: Epic 1 - Gestion profil
FR4: Epic 1 - Roles
FR5: Epic 1 - Preferences notifications
FR6: Epic 1 - Onboarding etudiant
FR7: Epic 1 - Profil type onboarding
FR8: Epic 1 - Modification besoins
FR9: Epic 2 - Recommandations mentors
FR10: Epic 2 - Recherche et filtres
FR11: Epic 2 - Profil mentor detaille
FR12: Epic 2 - Expertise/tarifs mentor
FR13: Epic 3 - Messagerie etudiant
FR14: Epic 3 - Messagerie mentor
FR15: Epic 3 - Notifications messages/RDV
FR16: Epic 3 - Disponibilites mentor
FR17: Epic 3 - Reservation RDV
FR18: Epic 3 - Annulation/report
FR19: Epic 3 - Visio/lien externe
FR20: Epic 3 - Historique sessions
FR21: Epic 4 - Parcours jalons
FR22: Epic 4 - Jalon termine
FR23: Epic 4 - Suivi mentor
FR24: Epic 5 - Publier/repondre communaute
FR25: Epic 5 - Signalement
FR26: Epic 5 - Moderation admin
FR27: Epic 6 - Avis mentor
FR28: Epic 6 - Validation mentor
FR29: Epic 7 - Gestion comptes/roles
FR30: Epic 6 - Gestion mentors (visibilite)
FR31: Epic 7 - Incidents support
FR32: Epic 7 - Tableaux de bord
FR33: Epic 1 - Consentement RGPD
FR34: Epic 7 - Suppression donnees


## Epic List

### Epic 1: Compte, rôles & onboarding
Les utilisateurs peuvent créer un compte, s’authentifier, gérer leur profil et compléter l’onboarding avec consentement.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR33

### Epic 2: Découverte & profils mentors
Les étudiants peuvent trouver des mentors pertinents et consulter leurs profils, tandis que les mentors définissent leur expertise et tarifs.
**FRs covered:** FR9, FR10, FR11, FR12

### Epic 3: Messagerie & rendez-vous
Étudiants et mentors échangent, planifient des sessions et accèdent à l’historique.
**FRs covered:** FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20

### Epic 4: Parcours de suivi & jalons
Suivi de progression avec jalons et visibilité côté mentor.
**FRs covered:** FR21, FR22, FR23

### Epic 5: Communauté & modération
Les étudiants publient/échangent, signalent, et les admins modèrent.
**FRs covered:** FR24, FR25, FR26

### Epic 6: Avis & confiance mentors
Les étudiants laissent des avis; l’admin valide les mentors et leur visibilité.
**FRs covered:** FR27, FR28, FR30

### Epic 7: Admin, support & analytics
Gestion comptes/roles, support incidents, tableaux de bord.
**FRs covered:** FR29, FR31, FR32


<!-- Repeat for each epic in epics_list (N = 1, 2, 3...) -->

## Epic 1: Compte, rôles & onboarding

Les utilisateurs peuvent créer un compte, s’authentifier, gérer leur profil et compléter l’onboarding avec consentement.

### Story 1.1: Inscription + connexion

As a étudiant/mentor,
I want créer un compte et me connecter,
So that accéder à la plateforme et mes fonctionnalités.

**Acceptance Criteria:**

**Given** un utilisateur non authentifié
**When** il complète le formulaire d’inscription valide
**Then** un compte est créé et l’utilisateur est connecté
**And** il est redirigé vers son espace

**Given** un utilisateur existant
**When** il saisit des identifiants valides
**Then** il est authentifié et accède à son espace
**And** une erreur claire s’affiche si les identifiants sont invalides

### Story 1.2: Récupération mot de passe

As a utilisateur,
I want réinitialiser mon mot de passe,
So that récupérer l’accès à mon compte.

**Acceptance Criteria:**

**Given** un utilisateur sur “Mot de passe oublié”
**When** il soumet son email valide
**Then** un email de réinitialisation est envoyé
**And** un message de confirmation est affiché

**Given** un utilisateur avec un lien de réinitialisation valide
**When** il définit un nouveau mot de passe conforme
**Then** le mot de passe est mis à jour
**And** il peut se connecter avec le nouveau mot de passe

### Story 1.3: Gestion du profil utilisateur

As a utilisateur,
I want consulter et modifier mon profil,
So that garder mes informations à jour.

**Acceptance Criteria:**

**Given** un utilisateur authentifié
**When** il accède à son profil
**Then** ses informations actuelles sont affichées

**Given** un utilisateur authentifié
**When** il modifie ses informations avec des données valides
**Then** les modifications sont enregistrées
**And** un feedback de succès est affiché

### Story 1.4: Gestion des rôles (RBAC)

As a admin,
I want attribuer et gérer les rôles des utilisateurs,
So that contrôler les accès selon les profils.

**Acceptance Criteria:**

**Given** un admin authentifié
**When** il assigne un rôle (étudiant/mentor/admin/support)
**Then** le rôle est enregistré
**And** les permissions associées prennent effet

**Given** un utilisateur non autorisé
**When** il tente d’accéder à une ressource protégée
**Then** l’accès est refusé avec un message approprié

### Story 1.5: Préférences de notifications

As a utilisateur,
I want configurer mes préférences de notifications,
So that recevoir les alertes que je souhaite.

**Acceptance Criteria:**

**Given** un utilisateur authentifié
**When** il active/désactive ses préférences
**Then** les préférences sont sauvegardées
**And** elles sont appliquées aux notifications futures

### Story 1.6: Onboarding étudiant guidé

As a étudiant,
I want compléter un onboarding guidé,
So that préciser mon profil et mes besoins.

**Acceptance Criteria:**

**Given** un étudiant nouvellement inscrit
**When** il suit les étapes d’onboarding
**Then** les réponses sont enregistrées étape par étape

**Given** un étudiant qui termine l’onboarding
**When** il valide la dernière étape
**Then** son onboarding est marqué comme complété

### Story 1.7: Profil type proposé

As a étudiant,
I want recevoir un profil type suggéré après onboarding,
So that gagner du temps dans la configuration.

**Acceptance Criteria:**

**Given** un étudiant ayant complété l’onboarding
**When** le système analyse ses réponses
**Then** un profil type est proposé
**And** l’étudiant peut l’accepter ou le modifier

### Story 1.8: Modification des besoins après onboarding

As a étudiant,
I want modifier mes besoins après l’onboarding,
So that adapter mon accompagnement.

**Acceptance Criteria:**

**Given** un étudiant authentifié
**When** il modifie ses besoins
**Then** les changements sont enregistrés
**And** ils sont pris en compte pour les recommandations

### Story 1.9: Consentement RGPD

As a utilisateur,
I want donner et gérer mon consentement RGPD,
So that contrôler l’usage de mes données.

**Acceptance Criteria:**

**Given** un utilisateur lors de l’inscription
**When** il accepte les conditions de consentement
**Then** son consentement est enregistré

**Given** un utilisateur authentifié
**When** il retire son consentement
**Then** le retrait est enregistré
**And** l’utilisateur est informé des impacts

## Epic 2: Découverte & profils mentors

Les étudiants peuvent trouver des mentors pertinents et consulter leurs profils, tandis que les mentors définissent leur expertise et tarifs.

### Story 2.1: Recommandations de mentors

As a étudiant,
I want recevoir des recommandations de mentors,
So that identifier rapidement des profils pertinents.

**Acceptance Criteria:**

**Given** un étudiant authentifié avec un profil complété
**When** il accède à la section mentors
**Then** une liste de mentors recommandés est affichée
**And** les recommandations sont basées sur son profil et besoins

### Story 2.2: Recherche et filtres

As a étudiant,
I want rechercher et filtrer les mentors,
So that trouver un mentor adapté à mes critères.

**Acceptance Criteria:**

**Given** un étudiant sur la page mentors
**When** il applique des filtres (domaine, prix, note, disponibilité)
**Then** la liste des mentors est mise à jour

**Given** un étudiant
**When** il saisit une recherche
**Then** les résultats sont filtrés selon la requête

### Story 2.3: Consultation du profil mentor

As a étudiant,
I want consulter un profil mentor détaillé,
So that évaluer sa pertinence avant de le contacter.

**Acceptance Criteria:**

**Given** un étudiant sur une carte mentor
**When** il ouvre le profil
**Then** les informations clés (bio, compétences, tarifs, avis, dispo) sont visibles

### Story 2.4: Profil mentor (expertise & tarifs)

As a mentor,
I want définir mon expertise et mes tarifs,
So that être proposé aux étudiants adaptés.

**Acceptance Criteria:**

**Given** un mentor authentifié
**When** il complète ou modifie son profil mentor
**Then** ses compétences, tarifs et disponibilités sont enregistrés
**And** son profil est visible dans les recherches

## Epic 3: Messagerie & rendez-vous

Étudiants et mentors échangent, planifient des sessions et accèdent à l’historique.

### Story 3.1: Messagerie étudiant → mentor

As a étudiant,
I want contacter un mentor via messagerie,
So that échanger avant un rendez-vous.

**Acceptance Criteria:**

**Given** un étudiant authentifié
**When** il envoie un message à un mentor
**Then** le message est transmis et visible dans le fil de discussion

### Story 3.2: Messagerie mentor → étudiant

As a mentor,
I want répondre aux messages des étudiants,
So that coordonner les échanges.

**Acceptance Criteria:**

**Given** un mentor authentifié
**When** il répond dans une conversation
**Then** le message est visible côté étudiant

### Story 3.3: Notifications messages et RDV

As a utilisateur,
I want recevoir des notifications liées aux messages et rendez-vous,
So that être informé rapidement.

**Acceptance Criteria:**

**Given** un message reçu ou un RDV mis à jour
**When** l’événement se produit
**Then** une notification est envoyée selon les préférences

### Story 3.4: Disponibilités mentor

As a mentor,
I want définir mes disponibilités,
So that permettre aux étudiants de réserver.

**Acceptance Criteria:**

**Given** un mentor authentifié
**When** il configure ses créneaux
**Then** les disponibilités sont enregistrées et visibles pour la réservation

### Story 3.5: Réservation d’un rendez-vous

As a étudiant,
I want réserver un rendez-vous avec un mentor,
So that planifier une session.

**Acceptance Criteria:**

**Given** un étudiant authentifié
**When** il choisit un créneau disponible
**Then** un RDV est créé et confirmé

### Story 3.6: Annulation et report de rendez-vous

As a utilisateur,
I want annuler ou reporter un rendez-vous,
So that ajuster mon planning.

**Acceptance Criteria:**

**Given** un RDV existant
**When** l’utilisateur annule ou reporte
**Then** le RDV est mis à jour
**And** l’autre partie est notifiée

### Story 3.7: Accès session visio

As a utilisateur,
I want accéder à une session visio (ou lien externe),
So that réaliser la session prévue.

**Acceptance Criteria:**

**Given** un RDV confirmé
**When** l’utilisateur accède au RDV
**Then** un lien visio sécurisé est disponible

### Story 3.8: Historique des sessions

As a utilisateur,
I want consulter l’historique des sessions,
So that suivre mes échanges passés.

**Acceptance Criteria:**

**Given** un utilisateur authentifié
**When** il consulte son historique
**Then** la liste des sessions passées est affichée

## Epic 4: Parcours de suivi & jalons

Suivi de progression avec jalons et visibilité côté mentor.

### Story 4.1: Parcours de suivi avec jalons

As a étudiant,
I want avoir un parcours de suivi structuré avec jalons,
So that organiser ma progression.

**Acceptance Criteria:**

**Given** un étudiant authentifié
**When** il accède à son parcours
**Then** ses jalons sont affichés avec leur statut

### Story 4.2: Marquer un jalon comme terminé

As a étudiant,
I want marquer un jalon comme terminé,
So that suivre mon avancement.

**Acceptance Criteria:**

**Given** un étudiant avec un jalon en cours
**When** il le marque comme terminé
**Then** le statut est mis à jour et la progression recalculée

### Story 4.3: Suivi de l’avancement par le mentor

As a mentor,
I want suivre l’avancement d’un étudiant,
So that adapter mon accompagnement.

**Acceptance Criteria:**

**Given** un mentor authentifié
**When** il consulte le suivi d’un étudiant
**Then** les jalons et leur statut sont visibles

## Epic 5: Communauté & modération

Les étudiants publient/échangent, signalent, et les admins modèrent.

### Story 5.1: Publier et répondre dans la communauté

As a étudiant,
I want publier et répondre dans la communauté,
So that échanger avec d’autres étudiants.

**Acceptance Criteria:**

**Given** un étudiant authentifié
**When** il publie un message ou répond
**Then** le contenu apparaît dans la communauté

### Story 5.2: Signalement de contenu

As a utilisateur,
I want signaler un contenu ou un comportement,
So that contribuer à la modération.

**Acceptance Criteria:**

**Given** un contenu inapproprié
**When** l’utilisateur le signale
**Then** le signalement est enregistré et visible pour les admins

### Story 5.3: Modération admin

As a admin,
I want modérer les contenus signalés,
So that maintenir un espace sûr.

**Acceptance Criteria:**

**Given** un admin authentifié
**When** il traite un signalement
**Then** il peut masquer/supprimer le contenu ou lever le signalement

## Epic 6: Avis & confiance mentors

Les étudiants laissent des avis; l’admin valide les mentors et leur visibilité.

### Story 6.1: Avis sur mentor

As a étudiant,
I want laisser un avis sur un mentor,
So that partager mon expérience.

**Acceptance Criteria:**

**Given** un étudiant ayant eu une session
**When** il laisse un avis
**Then** l’avis est enregistré et visible sur le profil mentor

### Story 6.2: Validation des mentors

As a admin,
I want vérifier/valider un profil mentor,
So that garantir la qualité des mentors.

**Acceptance Criteria:**

**Given** un mentor en attente de validation
**When** l’admin valide le profil
**Then** le mentor devient visible et actif

### Story 6.3: Gestion de la visibilité des mentors

As a admin,
I want gérer la visibilité des mentors,
So that ajuster l’affichage selon la qualité.

**Acceptance Criteria:**

**Given** un admin authentifié
**When** il modifie la visibilité d’un mentor
**Then** la visibilité est appliquée dans la recherche

## Epic 7: Admin, support & analytics

Gestion comptes/roles, support incidents, tableaux de bord.

### Story 7.1: Gestion comptes et rôles

As a admin,
I want gérer les comptes et rôles utilisateurs,
So that administrer la plateforme.

**Acceptance Criteria:**

**Given** un admin authentifié
**When** il modifie un compte ou un rôle
**Then** les changements sont enregistrés

### Story 7.2: Support incidents liés aux sessions

As a support,
I want consulter les incidents liés aux sessions,
So that aider à la résolution.

**Acceptance Criteria:**

**Given** un incident déclaré
**When** le support consulte le dossier
**Then** les détails de session sont visibles

### Story 7.3: Tableaux de bord de base

As a admin,
I want accéder à des tableaux de bord (matching, usage),
So that suivre l’activité globale.

**Acceptance Criteria:**

**Given** un admin authentifié
**When** il consulte le dashboard
**Then** des indicateurs de base sont affichés

### Story 7.4: Suppression des données personnelles

As a utilisateur,
I want demander la suppression de mes données,
So that exercer mon droit RGPD.

**Acceptance Criteria:**

**Given** un utilisateur authentifié
**When** il demande la suppression de ses données
**Then** la demande est enregistrée
**And** un processus de suppression est déclenché

## Epic 8: Renforcement du parcours mentor

Les mentors configurent une identite professionnelle complete, prouvent leur legitimite, pilotent leur disponibilite/offre et structurent l'accompagnement.

### Story 8.1: Identite mentor professionnelle

As a mentor,
I want configurer ma banniere, ma presentation et mes liens professionnels,
So that renforcer la confiance et mon image professionnelle.

**Acceptance Criteria:**

**Given** un mentor authentifie
**When** il met a jour son identite professionnelle
**Then** ses champs `banner`, `about`, `professionalLinks` sont enregistres
**And** ces informations sont visibles sur son profil public.

### Story 8.2: Expertise et legitimite structuree

As a mentor,
I want renseigner niveau d'etudes, diplomes et mots-cles,
So that ameliorer la qualite du matching et la credibilite de mon profil.

**Acceptance Criteria:**

**Given** un mentor authentifie
**When** il complete ses informations de legitimite
**Then** `educationLevel`, `degrees`, `keywords` sont persistes
**And** exploitables dans la recherche/matching et la vue profil.

### Story 8.3: Televersement diplomes mentor

As a mentor,
I want televerser mes diplomes et certificats,
So that permettre leur verification admin.

**Acceptance Criteria:**

**Given** un mentor authentifie
**When** il ajoute ou supprime un document
**Then** le document est gere via des endpoints securises mentor
**And** les admins peuvent consulter et statuer sur ces pieces.

### Story 8.4: Parametrage d'offre mentor

As a mentor,
I want definir mon type d'accompagnement,
So that controler mon positionnement economique et pedagogique.

**Acceptance Criteria:**

**Given** un mentor authentifie
**When** il choisit ses `supportTypes`
**Then** la configuration est enregistree
**And** visible/filtrable cote etudiant.

### Story 8.5: Gating strict publication mentor

As a mentor,
I want connaitre les prerequis de publication de mon profil,
So that savoir quoi completer avant d'etre visible.

**Acceptance Criteria:**

**Given** un mentor avec profil incomplet
**When** il tente de publier son profil
**Then** la publication est bloquee
**And** une liste explicite des elements manquants est affichee.

### Story 8.6: Fiabilisation persistance confiance

As a admin/support,
I want que validation, visibilite et avis soient persistes en base,
So that garantir stabilite et auditabilite apres redemarrage.

**Acceptance Criteria:**

**Given** une action admin/avis effectuee
**When** le service redemarre
**Then** l'etat reste coherent
**And** les historiques restent consultables.

### Story 8.7: Synchronisation Google Calendar

As a mentor,
I want synchroniser mon agenda Google,
So that eviter les conflits entre disponibilites internes et agenda externe.

**Acceptance Criteria:**

**Given** un mentor connecte a Google
**When** une plage est occupee en externe
**Then** le systeme bloque les reservations en conflit
**And** permet une synchronisation manuelle et automatique.

### Story 8.8: Controle mentor des demandes

As a mentor,
I want accepter ou refuser des demandes d'accompagnement avec motif,
So that garder l'autonomie sur mon perimetre d'intervention.

**Acceptance Criteria:**

**Given** une demande entrante
**When** le mentor accepte ou refuse
**Then** le statut est mis a jour
**And** l'etudiant recoit une notification avec le motif si refus.

### Story 8.9: Parcours mentor configurables

As a mentor,
I want creer des templates de parcours avec jalons et deadlines,
So that structurer l'accompagnement de maniere reproductible.

**Acceptance Criteria:**

**Given** un mentor authentifie
**When** il cree et assigne un template de parcours
**Then** les jalons et echeances sont generes pour l'etudiant
**And** le suivi mentor reste editable.

### Story 8.10: Stockage documentaire securise d'accompagnement

As a mentor,
I want partager et gerer des documents avec mes etudiants dans un espace securise,
So that centraliser les livrables de suivi.

**Acceptance Criteria:**

**Given** un mentor ou etudiant autorise
**When** il charge, liste ou supprime un document
**Then** les permissions sont strictement appliquees
**And** les documents restent accessibles uniquement aux participants legitimes.

---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-03-success
  - step-04-journeys
  - step-05-domain
  - step-06-innovation
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-Orig'ami-2026-01-16.md
  - doc_origami/DOSSIER FINAL ORIG'AMIS.pdf
  - doc_origami/Fonctionnalité prévue.docx
  - _bmad-output/planning-artifacts/input-docs/DOSSIER-FINAL-ORIGAMIS.txt
  - _bmad-output/planning-artifacts/input-docs/Fonctionnalite-prevue.txt
documentCounts:
  briefCount: 1
  researchCount: 0
  brainstormingCount: 0
  projectDocsCount: 2
classification:
  projectType: web_app
  domain: edtech
  complexity: medium
  projectContext: greenfield
workflowType: 'prd'
---

# Product Requirements Document - Orig'ami

**Author:** Mathieu  
**Date:** 2026-01-16

## Executive Summary

- Orig'ami est une plateforme d’accompagnement académique pour étudiants du supérieur.
- L’expérience combine onboarding personnalisé, matching mentors, messagerie/RDV, suivi et communauté.
- Le MVP vise la validation de la valeur perçue via un accompagnement structuré et mesurable.

## Success Criteria

### User Success

- Activation onboarding : % d’étudiants qui complètent le profil et définissent leurs besoins
- Matching réussi : % d’étudiants recevant ≥ 1 mentor/reco pertinente
- Engagement : WAU/MAU, sessions par semaine
- Suivi : % d’étudiants qui complètent un jalon
- Satisfaction : note moyenne, NPS/CSAT

### Business Success

- Acquisition : croissance mensuelle d’inscrits
- Conversion : taux freemium → premium
- Rétention : % d’utilisateurs actifs à 30/90 jours
- Monétisation : MRR ou revenu par utilisateur
- Offre mentors : mentors actifs + taux de disponibilité

### Technical Success

- Disponibilité plateforme (SLA à définir)
- Délai moyen de matching (à définir)
- Qualité des communications (messagerie/visio)

### Measurable Outcomes

- Activation onboarding : 60–70%
- Matching : 70% en < 24h
- Conversion premium : 5–10%
- Rétention 30j : 25–35%
- Sessions mentor : X/mois (à définir)

## Product Scope

### MVP - Minimum Viable Product

- Onboarding personnalisé (profil, besoins, niveau)
- Matching intelligent vers mentors/ressources
- Profils mentors (infos, compétences, avis, tarifs)
- Messagerie temps réel étudiant/mentor
- Prise de rendez-vous + visio intégrée ou lien externe
- Parcours de suivi avec jalons
- Communauté étudiante
- Notifications et rappels personnalisables

### Growth Features (Post-MVP)

- IA de synthèse / replay intelligent
- Outils avancés d’aide au mémoire et planification
- Parcours personnalisés approfondis (académique + soft skills)

### Vision (Future)

- Partenariats avec établissements
- Extension à d’autres segments éducatifs

## User Journeys

### Étudiant – parcours principal (réussite)

Lina, 20 ans, L2, se sent débordée. Elle s’inscrit, complète son profil et reçoit un mentor adapté.  
Elle échange en messagerie, réserve un rendez-vous, puis suit un parcours jalonné.  
Après quelques sessions, elle se sent plus structurée et améliore ses résultats.

### Étudiant – parcours edge case (blocage)

Nassim, 23 ans, prépare un mémoire. Il abandonne l’onboarding après un matching non satisfaisant.  
Un rappel le ramène, il consulte la communauté, puis finit par réserver un mentor.  
Le produit évite l’abandon via rappels et alternatives de parcours.

### Mentor – onboarding et accompagnement

Claire, mentor, crée son profil, indique son expertise et ses disponibilités.  
Elle reçoit des demandes, échange, planifie des sessions et suit l’avancement.  
Les avis positifs augmentent sa visibilité.

### Admin/Ops – gestion et qualité

Sophie valide les mentors, modère la communauté et suit les retours.  
Elle ajuste la visibilité des profils et intervient sur les signalements.

### Support – résolution d’incident

Tom gère un incident visio. Il consulte l’historique, recontacte les parties et propose un nouveau créneau.

### Journey Requirements Summary

- Onboarding + profils complets
- Matching intelligent + alternatives
- Messagerie, RDV, visio
- Communauté + modération
- Admin/ops + support
- Suivi jalons + retours

## Domain-Specific Requirements

### Compliance & Regulatory

- RGPD : protection des données étudiantes
- Consentement explicite pour la collecte
- Si mineurs : conformité type COPPA/équivalent (à confirmer)
- Politique de conservation/suppression des données

### Technical Constraints

- Chiffrement des données sensibles au repos et en transit
- Contrôle d’accès par rôle
- Traçabilité des actions sensibles

### Integration Requirements

- Pas d’intégrations obligatoires à ce stade
- Architecture extensible (LMS/agenda)

### Risk Mitigations

- Modération + signalement
- Prévention de l’usurpation de mentors
- Gestion des conflits/abus en session

## Web App Specific Requirements

### Project-Type Overview

Web app SPA avec SEO, temps réel (messagerie/notifications) et accessibilité renforcée.

### Technical Architecture Considerations

- Rendu serveur ou pré-rendu pour les pages publiques SEO
- Temps réel requis pour messagerie et notifications
- Visio via intégration interne ou service externe

### Browser Matrix

- Chrome, Firefox, Safari, Edge (versions récentes)

### Responsive Design

- Expérience complète desktop/tablette/mobile

### SEO Strategy

- Pages publiques indexables (landing, présentation)
- Zones authentifiées non prioritaires SEO

### Accessibility Level

- Cible WCAG 2.1 AA

### Implementation Considerations

- Notifications web push
- Gestion d’état temps réel et mode offline léger

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP Approach:** Experience MVP (valider l’accompagnement et la valeur perçue)  
**Resource Requirements:** équipe réduite (dev full-stack + UX + PM/ops léger)

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**

- Étudiant parcours principal
- Mentor onboarding/accompagnement
- Admin/ops + support de base

**Must-Have Capabilities:**

- Onboarding personnalisé
- Matching intelligent
- Profils mentors
- Messagerie + notifications
- Prise de RDV + visio (ou visio externalisée)
- Parcours de suivi avec jalons
- Communauté + modération minimale

### Post-MVP Features

**Phase 2 (Post-MVP):**

- IA de synthèse / replay intelligent
- Outils avancés d’aide au mémoire et planification
- Parcours personnalisés approfondis

**Phase 3 (Expansion):**

- Partenariats avec établissements
- Extension à d’autres segments éducatifs

### Risk Mitigation Strategy

**Technical Risks:** visio/temps réel → externaliser au départ + MVP simplifié  
**Market Risks:** adoption étudiante → tester onboarding + matching + feedback rapide  
**Resource Risks:** scope trop large → prioriser messagerie/RDV avant features avancées

## Functional Requirements

### User & Access Management

- FR1: Les utilisateurs peuvent créer un compte et se connecter.
- FR2: Les utilisateurs peuvent récupérer leur mot de passe.
- FR3: Les utilisateurs peuvent gérer leur profil (infos, niveau, objectifs).
- FR4: Le système gère des rôles distincts (étudiant, mentor, admin, support).
- FR5: Les utilisateurs peuvent gérer leurs préférences de notifications.

### Onboarding & Needs Capture

- FR6: Les étudiants peuvent compléter un onboarding guidé (diplôme, besoins, contexte).
- FR7: Le système peut proposer un profil type basé sur les réponses d’onboarding.
- FR8: Les étudiants peuvent modifier leurs besoins après onboarding.

### Mentor Discovery & Matching

- FR9: Le système propose des mentors/recommandations personnalisées.
- FR10: Les étudiants peuvent rechercher et filtrer des mentors.
- FR11: Les étudiants peuvent consulter un profil mentor détaillé.
- FR12: Les mentors peuvent définir leur expertise et tarifs.

### Communication & Engagement

- FR13: Les étudiants peuvent contacter un mentor via messagerie.
- FR14: Les mentors peuvent répondre et suivre les échanges.
- FR15: Le système envoie des notifications liées aux messages et rendez-vous.

### Scheduling & Sessions

- FR16: Les mentors peuvent définir leurs disponibilités via un agenda.
- FR17: Les étudiants peuvent réserver un rendez-vous.
- FR18: Le système gère l’annulation et le report d’un rendez-vous.
- FR19: Le système permet l’accès à une session visio ou un lien externe.
- FR20: Les utilisateurs peuvent consulter l’historique des sessions.

### Learning Journey & Follow-up

- FR21: Le système propose un parcours de suivi avec jalons.
- FR22: Les étudiants peuvent marquer un jalon comme terminé.
- FR23: Les mentors peuvent suivre l’avancement d’un étudiant.

### Community & Moderation

- FR24: Les étudiants peuvent publier et répondre dans la communauté.
- FR25: Les utilisateurs peuvent signaler un contenu ou un comportement.
- FR26: Les admins peuvent modérer les contenus signalés.

### Reviews & Trust

- FR27: Les étudiants peuvent laisser un avis sur un mentor.
- FR28: Les admins peuvent vérifier/valider un profil mentor.

### Admin & Support Operations

- FR29: Les admins peuvent gérer les comptes et rôles.
- FR30: Les admins peuvent gérer les mentors (validation, visibilité).
- FR31: Le support peut consulter les incidents liés aux sessions.
- FR32: Le système fournit des tableaux de bord de base (matching, usage).

### Compliance & Safety

- FR33: Le système gère le consentement des données personnelles.
- FR34: Les utilisateurs peuvent demander la suppression de leurs données.

## Non-Functional Requirements

### Performance

- 95% des pages publiques se chargent en < 3s sur réseau standard.
- Actions clés (recherche mentor, envoi message, prise de RDV) répondent en < 2s.

### Security

- Données sensibles chiffrées en transit (TLS) et au repos.
- Contrôle d’accès basé sur rôles.
- Journalisation des actions sensibles.

### Scalability

- Support d’une croissance x10 d’utilisateurs sans refonte majeure.
- Support des pics de trafic (inscriptions/rentrée) sans dégradation critique.

### Accessibility

- Conformité cible WCAG 2.1 AA.
- Navigation clavier complète, contrastes suffisants, labels lisibles.

### Reliability

- Disponibilité cible 99.5% mensuelle.
- Restauration en cas d’incident critique < 24h (objectif).

### Integration

- Capacité d’intégrer un service de visio externe via lien sécurisé.

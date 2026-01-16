# Story 2.1: Recommandations de mentors

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want recevoir des recommandations de mentors,
so that identifier rapidement des profils pertinents.

## Acceptance Criteria

1. Given un étudiant authentifié avec un profil complété When il accède à la section mentors Then une liste de mentors recommandés est affichée And les recommandations sont basées sur son profil et besoins

## Tasks / Subtasks

- [ ] Mettre en place service de recommandation + règles (profil, besoins, disponibilités) (AC: #1)
- [ ] Exposer endpoint `GET /mentors/recommendations` avec pagination + filtres contextuels (AC: #1)
- [ ] Intégrer données sources (onboarding, objectifs, historique interactions) dans scoring (AC: #1)
- [ ] UI recommandations (cartes, badge recommandé, CTA) + skeletons (AC: #1)
- [ ] Ajouter cache TTL (ex: Redis) pour éviter recalcul, invalider sur mise à jour (AC: #1)
- [ ] Tests API scoring + UI affichage + accessibilité (AC: #1)

## Dev Notes

### Dev Notes

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0 (migrations Prisma).
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON, endpoints pluriel.
- UX: responsive + WCAG 2.1 AA, pages publiques SEO.
- Cible: modules matching/mentors.
- Recherche + filtres UI.

### Recommandation & scoring

- Règles: correspondance onboarding (niveau, objectifs), besoins actuels, disponibilité mentor.
- Préférer mentors validés, disponibles (`mentor_availability`). Indiquer score + signaux.
- Documenter signaux pour la responsabilité de la recommandation.

### API Contracts (recommendations)

- `GET /mentors/recommendations?cursor=&limit=&filters=` -> `{ data: { mentors, metadata }, error: null }`
- Metadata: `scoring_signals`, `applied_filters`, `next_cursor`.
- Erreurs: `{ error: { code, message, details? } }`

### Donnees (minimum)

- `mentor_profiles`, `mentor_availability`, `user_intents`, `recommendation_cache`.
- `user_intents` stocke préférences (domaine, budget).
- Conventions: `snake_case`.

### Validation & UX

- Cards: badge "recommandé", tags domaine/prix/note.
- CTA unique “Voir le mentor” / “Envoyer un message”.
- Skeleton + spinner (aria-live) lors du chargement.
- Message clair si aucun mentor ne correspond.

### Project Structure Notes

- Web: `apps/web/src/features/mentors/recommendations`.
- API: `apps/api/src/modules/mentors` + `modules/matching`.
- Shared DTOs: `packages/shared/src/schemas`.

### Testing Requirements

- API: scoring stable, pagination, cache invalidation tests.
- UI: cartes, badges, feedback erreurs (a11y).
- Test de performance pour la recommandation live.

### Do / Don’t

- Do: document les signaux utilisés dans le scoring.
- Don’t: présenter mentors non validés / sans créneau.

### References

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

### Completion Notes List

### File List

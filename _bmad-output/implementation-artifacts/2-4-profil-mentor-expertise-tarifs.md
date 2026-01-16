# Story 2.4: Profil mentor (expertise & tarifs)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a mentor,
I want définir mon expertise et mes tarifs,
so that être proposé aux étudiants adaptés.

## Acceptance Criteria

1. Given un mentor authentifié When il complète ou modifie son profil mentor Then ses compétences, tarifs et disponibilités sont enregistrés And son profil est visible dans les recherches

## Tasks / Subtasks

- [ ] Ajouter module mentor (profil, expertise, tarifs, disponibilités) (AC: #1)
- [ ] Exposer endpoints `GET /mentors/me`, `POST /mentors/me`, `PATCH /mentors/me` (AC: #1)
- [ ] Validation des champs (compétences, tarifs, langues, disponibilités) (AC: #1)
- [ ] UI tableau de bord mentor (formulaire + aperçu dispo) (AC: #1)
- [ ] Tester flux complet (création, mise à jour, validations) (AC: #1)

## Dev Notes

### Dev Notes

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0 (migrations Prisma).
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON, endpoints pluriel.
- UX: responsive + WCAG 2.1 AA, pages publiques SEO.
- Cible: modules matching/mentors.

### Mentor profile editing

- Champs: domaines, compétences, tarifs (par créneau), langues, disponibilités, reviews.
- Supporter multiple disponibilités (slots) / jours, format UTC.
- Indiquer tags (expertises, languages, certification).

### API Contracts (mentor self-service)

- `GET /mentors/me` -> `{ data: { profile }, error: null }`
- `POST /mentors/me` (création) -> `{ data: { profile }, error: null }`
- `PATCH /mentors/me` (mise à jour) -> `{ data: { profile }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`

### Donnees (minimum)

- `mentor_profiles`, `mentor_expertise`, `mentor_availability`.
- `mentor_tariffs` pour planning (unités horaires, tiers).
- Conventions `snake_case`.

### UX & validation

- Form esprit "mentor" (sections résumé, disponibilité, tarifs).
- Valider `tariffs` (positive, min < max, currency).
- Accessibilité: titres, labels, focus.
- Feedback success accessible (toast/aria-live).

### Project Structure Notes

- Web: `apps/web/src/features/mentors/settings`.
- API: `apps/api/src/modules/mentors`.
- Shared DTOs: `packages/shared/src/schemas`.

### Testing Requirements

- API: création, update, validations, access RBAC.
- UI: formulaire mentor, sections, validations, mobile.
- Integration: ensure mentor visible in search after publication.

### Do / Don’t

- Do: respecter RBAC (seul mentor modifie son profil).
- Don’t: afficher données mentors avant validation.

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

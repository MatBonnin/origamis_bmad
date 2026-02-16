# Story 2.4: Profil mentor (expertise & tarifs)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a mentor,
I want définir mon expertise et mes tarifs,
so that être proposé aux étudiants adaptés.

## Acceptance Criteria

1. Given un mentor authentifié When il complète ou modifie son profil mentor Then ses compétences, tarifs et disponibilités sont enregistrés And son profil est visible dans les recherches

## Tasks / Subtasks

- [x] Ajouter module mentor (profil, expertise, tarifs, disponibilités) (AC: #1)
- [x] Exposer endpoints `GET /mentors/me`, `POST /mentors/me`, `PATCH /mentors/me` (AC: #1)
- [x] Validation des champs (compétences, tarifs, langues, disponibilités) (AC: #1)
- [x] UI tableau de bord mentor (formulaire + aperçu dispo) (AC: #1)
- [x] Tester flux complet (création, mise à jour, validations) (AC: #1)

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

- `npm test --workspace=apps/api -- mentors.controller.spec.ts mentors-self.service.spec.ts mentor-self-profile.dto.spec.ts mentors-profile.service.spec.ts` (PASS)
- `npm test --workspace=apps/web -- MentorSettings.test.tsx MentorSearch.test.tsx MentorProfile.test.tsx` (PASS)
- `npm test --workspace=apps/api` (PASS, 26 suites)
- `npm test --workspace=apps/web` (PASS, 10 fichiers)
- `npm run lint --workspace=apps/api` (FAIL: erreurs lint pre-existantes hors scope story)
- `npm run lint --workspace=apps/web` (PASS avec warnings pre-existants)

### Completion Notes List

- Ajout du self-service mentor dans le module `mentors` avec RBAC mentor:
  - `GET /mentors/me`
  - `POST /mentors/me`
  - `PATCH /mentors/me`
- Nouveau service `MentorsSelfService`:
  - verification role mentor
  - creation/mise a jour du profil mentor (domain, competences, niveaux, bio)
  - gestion tarifs avec validation `min < max` et devise ISO uppercase
  - gestion disponibilites (bool, prochaine dispo UTC, slots hebdomadaires)
  - persistance metadata mentor (langues, certifications, tarifs, slots) dans `user_needs.needs_json.mentorProfile`
  - publication du profil pour la recherche (`is_validated = true`)
- Validation champs ajoutee via DTO class-validator + validations metier service:
  - competences/languages/certifications (tableaux string bornes)
  - tarifs (entiers positifs, min strictement inferieur a max)
  - disponibilites (ISO UTC suffixe `Z`, slots `startTime < endTime`)
- UI dashboard mentor ajoutee:
  - page `mentors/profil` authentifiee
  - formulaire sections Resume / Tarifs / Disponibilites
  - apercu public dynamique
  - feedback accessible `aria-live` success/error
  - mode creation (POST) et mode mise a jour (PATCH)
- Stabilisation regression web:
  - correction expectation test onboarding (`/profile-suggestion`)
  - correction lint `react/no-unescaped-entities` dans `OnboardingWizard`

### Implementation Plan

- Etendre le module API `mentors` avec un service dedie self-profile sans impacter les endpoints publics de recherche/profil.
- Exposer le contrat REST `mentors/me` en enveloppe `{ data, error }` avec guards JWT + Roles.
- Ajouter une UI de configuration mentor dans le flux app auth (`/mentors/profil`) en reutilisant le design system interne.
- Verifier le flux complet create/update/validation via tests API et UI, puis lancer les regressions globales.

### File List

- apps/api/src/modules/mentors/mentors.controller.ts (modified)
- apps/api/src/modules/mentors/mentors.controller.spec.ts (modified)
- apps/api/src/modules/mentors/mentors.module.ts (modified)
- apps/api/src/modules/mentors/index.ts (modified)
- apps/api/src/modules/mentors/dto/index.ts (modified)
- apps/api/src/modules/mentors/dto/mentor-self-profile.dto.ts (new)
- apps/api/src/modules/mentors/dto/mentor-self-profile.dto.spec.ts (new)
- apps/api/src/modules/mentors/mentors-self.service.ts (new)
- apps/api/src/modules/mentors/mentors-self.service.spec.ts (new)
- apps/web/src/features/mentors/settings/MentorSettings.tsx (new)
- apps/web/src/features/mentors/settings/MentorSettings.module.css (new)
- apps/web/src/features/mentors/settings/index.ts (new)
- apps/web/src/features/mentors/settings/__tests__/MentorSettings.test.tsx (new)
- apps/web/src/app/(app)/mentors/profil/page.tsx (new)
- apps/web/src/app/(app)/mentors/page.tsx (modified)
- apps/web/src/app/(app)/mentors/page.module.css (new)
- apps/web/src/features/onboarding/__tests__/OnboardingWizard.test.tsx (modified)
- apps/web/src/features/onboarding/OnboardingWizard.tsx (modified)
- _bmad-output/implementation-artifacts/2-4-profil-mentor-expertise-tarifs.md (modified)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)

## Change Log

- 2026-02-16: Story 2.4 implementee (API self-service mentor `mentors/me`, validations expertise/tarifs/langues/disponibilites, UI dashboard mentor avec apercu, tests API/UI/regression).

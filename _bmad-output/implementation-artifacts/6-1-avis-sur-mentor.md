# Story 6.1: Avis sur mentor

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Ã©tudiant,
I want laisser un avis sur un mentor,
so that partager mon expÃ©rience.

## Acceptance Criteria

1. Given un Ã©tudiant ayant eu une session When il laisse un avis Then lâ€™avis est enregistrÃ© et visible sur le profil mentor

## Tasks / Subtasks

- [x] CrÃ©er tables `mentor_reviews`, `mentor_ratings`, `mentor_review_flags` (AC: #1)
- [x] Endpoint `POST /mentors/:id/reviews`, `GET /mentors/:id/reviews` (AC: #1)
- [x] UI: affichage avis, call-to-action pour rÃ©diger, visualiser notes (AC: #1)
- [x] Gestion du fil dâ€™avis (pagination, Ã©dition, suppression) + webhooks (AC: #1)
- [x] Tests API + mixitÃ© UI + validation (AC: #1)

## Dev Notes

- Stack: Next.js (front) + NestJS (API), TypeScript
- DB: PostgreSQL 17 + Prisma 7.2.0 (migrations Prisma)
- Auth: NextAuth 4.24.13 + JWT + RBAC
- API: REST + Swagger + WebSocket
- Conventions: snake_case DB, camelCase JSON, enveloppe {data, error}
- UX: responsive + WCAG 2.1 AA + pages publiques SEO
- Cible: reviews + admin
- Avis et validation mentors

### API Contracts (reviews)

- `POST /mentors/:id/reviews` -> `{ data: { review }, error: null }`
- `GET /mentors/:id/reviews?cursor=` -> `{ data: { reviews, metadata }, error: null }`
- `PATCH /mentors/:id/reviews/:review_id` -> `{ data: { review }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `mentor_reviews`: `id`, `mentor_id`, `student_id`, `rating`, `body`, `created_at`, `status`.
- `mentor_ratings`: `mentor_id`, `average_rating`, `review_count`.
- `mentor_review_flags`: `review_id`, `reporter_id`, `reason`, `status`.
- Conventions `snake_case`.

### UX & accessibilitÃ©

- Liste dâ€™avis avec note moyenne, avatars, filtres (rÃ©cents, notes).
- Formulaire accessible (aria-live), validations (min/max length).
- Indicateur de progression (moyenne) + CTA â€œLaisser un avisâ€.
- Reader mode (contraste, taille).

### Testing Requirements

- API: review submission, pagination, edits, flags.
- UI: form, review list, accessible badges.
- Real-time: updates propagate via WebSocket/notifications if needed.

### Do / Donâ€™t

- Do: valider quâ€™un Ã©tudiant a une session (booking) avant avis.
- Do: bloquer simple duplication (unique per booking).
- Donâ€™t: afficher avis non validÃ©s (status `pending`).

### Project Structure Notes

- Web: `apps/web/src/features/reviews`.
- API: `apps/api/src/modules/reviews`.
- Shared DTOs: `packages/shared/src/schemas`.

### References

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

- npm test -- modules/mentors (apps/api)
- npm test -- src/features/mentors/profile/__tests__/MentorProfile.test.tsx src/features/admin/mentor-validation/__tests__/MentorValidationBoard.test.tsx src/features/admin/visibility/__tests__/MentorVisibilityBoard.test.tsx (apps/web)

### Completion Notes List

- Implementation du flux d avis mentor (POST/GET/PATCH/DELETE) avec controle booking, anti-duplication par booking et pagination metadata.
- Ajout du formulaire de soumission d avis dans le profil mentor avec rafraichissement de la liste.
- Ajout des modeles Prisma et migration pour mentor_reviews, mentor_ratings, mentor_review_flags.
- Ajout et mise a jour des tests API/Web pour les flux reviews.

### File List

- apps/api/prisma/schema.prisma
- apps/api/prisma/migrations/202602181200_epic6_mentors_reviews_validation_visibility/migration.sql
- apps/api/src/modules/mentors/mentors-profile.service.ts
- apps/api/src/modules/mentors/mentors.controller.ts
- apps/api/src/modules/mentors/mentors-profile.service.spec.ts
- apps/api/src/modules/mentors/mentors.controller.spec.ts
- apps/web/src/features/mentors/profile/MentorProfile.tsx
- apps/web/src/features/mentors/profile/MentorProfile.module.css
- apps/web/src/features/mentors/profile/__tests__/MentorProfile.test.tsx

### Change Log

- 2026-02-18: Implementation complete du flux d avis mentor (API + UI + tests) et ajout des tables Prisma associees.

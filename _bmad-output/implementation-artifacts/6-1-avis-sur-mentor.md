# Story 6.1: Avis sur mentor

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want laisser un avis sur un mentor,
so that partager mon expérience.

## Acceptance Criteria

1. Given un étudiant ayant eu une session When il laisse un avis Then l’avis est enregistré et visible sur le profil mentor

## Tasks / Subtasks

- [ ] Créer tables `mentor_reviews`, `mentor_ratings`, `mentor_review_flags` (AC: #1)
- [ ] Endpoint `POST /mentors/:id/reviews`, `GET /mentors/:id/reviews` (AC: #1)
- [ ] UI: affichage avis, call-to-action pour rédiger, visualiser notes (AC: #1)
- [ ] Gestion du fil d’avis (pagination, édition, suppression) + webhooks (AC: #1)
- [ ] Tests API + mixité UI + validation (AC: #1)

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

### UX & accessibilité

- Liste d’avis avec note moyenne, avatars, filtres (récents, notes).
- Formulaire accessible (aria-live), validations (min/max length).
- Indicateur de progression (moyenne) + CTA “Laisser un avis”.
- Reader mode (contraste, taille).

### Testing Requirements

- API: review submission, pagination, edits, flags.
- UI: form, review list, accessible badges.
- Real-time: updates propagate via WebSocket/notifications if needed.

### Do / Don’t

- Do: valider qu’un étudiant a une session (booking) avant avis.
- Do: bloquer simple duplication (unique per booking).
- Don’t: afficher avis non validés (status `pending`).

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

### Completion Notes List

### File List

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

### Completion Notes List

### File List

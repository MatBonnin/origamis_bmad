# Story 2.3: Consultation du profil mentor

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want consulter un profil mentor détaillé,
so that évaluer sa pertinence avant de le contacter.

## Acceptance Criteria

1. Given un étudiant sur une carte mentor When il ouvre le profil Then les informations clés (bio, compétences, tarifs, avis, dispo) sont visibles

## Tasks / Subtasks

- [ ] Exposer endpoint `GET /mentors/:id` avec relations (bio, compétences, avis, disponibilité) (AC: #1)
- [ ] Implémenter service avis + notes (calcul note moyenne, pondération) (AC: #1)
- [ ] UI profil mentor (header, CTA contact/RDV, sections compétences/avis/dispo) (AC: #1)
- [ ] Chargement progressif (skeletons, fallback) (AC: #1)
- [ ] Tests API + UI + accessibilité (AC: #1)

## Dev Notes

### Dev Notes

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0 (migrations Prisma).
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON, endpoints pluriel.
- UX: responsive + WCAG 2.1 AA, pages publiques SEO.
- Cible: modules matching/mentors.

### Profil mentor

- Sections: header (photo, note, tarification), compétences, avis (votes), disponibilité, CTA contact/RDV.
- Mentionner pattern `enveloppe { data, error }`.
- Montrer tags: disciplines, langues, jeunes etc.

### API Contracts (profil mentor)

- `GET /mentors/:id` -> `{ data: { mentor, reviews, availability }, error: null }`
- `GET /mentors/:id/reviews` -> `{ data: { reviews, pagination }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`

### Donnees (minimum)

- `mentor_profiles`, `mentor_reviews`, `mentor_availability`, `mentor_ratings`.
- `mentor_reviews` contient `rating`, `comment`, `author`.
- `mentor_availability` structuré par créneaux (UTC).
- Conventions `snake_case`.

### UX & accesibilité

- Skeletons (card + reviews) + spinner `aria-live`.
- Buttons accessibles (focus, target >=44px).
- Avis triés par récent, mention de la source (session/feedback).
- CTA unique “Contacter” + “Prendre RDV”.

### Project Structure Notes

- Web: `apps/web/src/features/mentors/profile`.
- API: `apps/api/src/modules/mentors`.
- Shared DTOs: `packages/shared/src/schemas`.

### Testing Requirements

- API: `GET /mentors/:id`, pagination/reviews, erreurs 404.
- UI: header, badge, review list, clubhouse.
- Accessibilité: focus states, aria-live for feedback.

### Do / Don’t

- Do: afficher la source du review (session/feedback).
- Don’t: afficher de données sensibles (emails, tokens).

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

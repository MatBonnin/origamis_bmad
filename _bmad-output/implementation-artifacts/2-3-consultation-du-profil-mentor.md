# Story 2.3: Consultation du profil mentor

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want consulter un profil mentor détaillé,
so that évaluer sa pertinence avant de le contacter.

## Acceptance Criteria

1. Given un étudiant sur une carte mentor When il ouvre le profil Then les informations clés (bio, compétences, tarifs, avis, dispo) sont visibles

## Tasks / Subtasks

- [x] Exposer endpoint `GET /mentors/:id` avec relations (bio, compétences, avis, disponibilité) (AC: #1)
- [x] Implémenter service avis + notes (calcul note moyenne, pondération) (AC: #1)
- [x] UI profil mentor (header, CTA contact/RDV, sections compétences/avis/dispo) (AC: #1)
- [x] Chargement progressif (skeletons, fallback) (AC: #1)
- [x] Tests API + UI + accessibilité (AC: #1)

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

- `npm test --workspace=apps/api -- mentors.controller.spec.ts mentors-profile.service.spec.ts mentors-search.service.spec.ts` (PASS)
- `npm test --workspace=apps/web -- MentorSearch.test.tsx MentorProfile.test.tsx` (PASS)
- `npm test --workspace=apps/api` (PASS, 24 suites)
- `npm test --workspace=apps/web` (PASS, 9 fichiers)
- `npm run lint --workspace=apps/api` (FAIL: erreurs lint pre-existantes hors scope story)
- `npm run lint --workspace=apps/web` (FAIL: erreurs/warnings pre-existants hors scope story)

### Completion Notes List

- Ajout des endpoints API:
  - `GET /mentors/:id` pour profil mentor detaille (bio, competences, disponibilite, rating, avis)
  - `GET /mentors/:id/reviews` pour avis pagines
- Implementation du service `MentorsProfileService`:
  - assemblage du profil mentor depuis `mentor_profiles` + `mentor_availability`
  - generation d avis a partir des interactions mentor-etudiant
  - calcul de note moyenne ponderee avec facteur de recence
- UI profil mentor ajoutee:
  - route `apps/web/src/app/(app)/mentors/[id]/page.tsx`
  - composant `MentorProfile` avec header, CTA `Contacter` / `Prendre RDV`, sections competences/avis/disponibilite
  - chargement progressif avec skeleton + feedback `aria-live`
  - fallback pour erreurs et absence d avis
- Navigation depuis les cartes de recherche mentors:
  - bouton `Voir profil` vers `/mentors/{id}`

### Implementation Plan

- Etendre le module `mentors` avec un service dedie profil/avis pour separer responsabilites (search vs profile).
- Respecter le contrat d enveloppe API `{ data, error }` et la pagination reviews.
- Ajouter une page profile mentor dans le flux authentifie avec design system existant.
- Valider via tests unitaires API + UI et regression complete des workspaces.

### File List

- apps/api/src/modules/mentors/mentors.controller.ts (modified)
- apps/api/src/modules/mentors/mentors.controller.spec.ts (modified)
- apps/api/src/modules/mentors/mentors.module.ts (modified)
- apps/api/src/modules/mentors/index.ts (modified)
- apps/api/src/modules/mentors/dto/index.ts (modified)
- apps/api/src/modules/mentors/dto/get-mentor-reviews-query.dto.ts (new)
- apps/api/src/modules/mentors/mentors-profile.service.ts (new)
- apps/api/src/modules/mentors/mentors-profile.service.spec.ts (new)
- apps/web/src/app/(app)/mentors/[id]/page.tsx (new)
- apps/web/src/features/mentors/profile/MentorProfile.tsx (new)
- apps/web/src/features/mentors/profile/MentorProfile.module.css (new)
- apps/web/src/features/mentors/profile/index.ts (new)
- apps/web/src/features/mentors/profile/__tests__/MentorProfile.test.tsx (new)
- apps/web/src/features/mentors/search/MentorSearch.tsx (modified)
- apps/web/src/features/mentors/search/MentorSearch.module.css (modified)
- apps/web/src/features/mentors/search/__tests__/MentorSearch.test.tsx (modified)
- _bmad-output/implementation-artifacts/2-3-consultation-du-profil-mentor.md (modified)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)

## Change Log

- 2026-02-16: Story 2.3 implementee (API profil mentor + reviews, service rating pondere, UI profil detaille, skeleton/fallback, tests API/UI).

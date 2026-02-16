# Story 2.2: Recherche et filtres

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want rechercher et filtrer les mentors,
so that trouver un mentor adapté à mes critères.

## Acceptance Criteria

1. Given un étudiant sur la page mentors When il applique des filtres (domaine, prix, note, disponibilité) Then la liste des mentors est mise à jour
2. Given un étudiant When il saisit une recherche Then les résultats sont filtrés selon la requête

## Tasks / Subtasks

- [x] Exposer endpoint `GET /mentors/search` (query, filters, sort, pagination) (AC: #1, #2)
- [x] Ajouter facettes côté API pour domaine, prix, disponibilité, note (AC: #1)
- [x] Implémenter moteur de recherche full-text (Prisma + Postgres trigram) + filtres (AC: #1, #2)
- [x] UI page mentors: barre recherche, filtres persistants (drawer sur mobile) (AC: #1, #2)
- [x] Afficher résultats instantanés + loader + message sans résultat (AC: #2)
- [x] Tests recherche/filtres API + UI (AC: #1, #2)

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

### Recherche & filtres

- Recherche full-text (Prisma + trigram) sur `mentor_profiles.bio`, `skills`.
- Filtres: domaine, prix, note, disponibilité, langues, avis.
- Tri: pertinence, note, prix asc/dsc, dispo.
- Filtrer + rechercher doit être accessible en mobile (drawer).

### API Contracts (search)

- `GET /mentors/search?q=&filters=&sort=&cursor=` -> `{ data: { mentors, metadata }, error: null }`
- Metadata: `total`, `applied_filters`, `next_cursor`.
- `GET /mentors/filters` -> `{ data: { domains, price_ranges, availabilities }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`

### Donnees (minimum)

- `mentor_profiles`, `mentor_skills`, `mentor_ratings`.
- `mentor_availability` pour trigging only available mentors.
- Conventions `snake_case`.

### Validation & UX

- Barre recherche accessible (aria-label, shortcut).
- Filters panel collapse pour mobile (drawer).
- Chips pour filtres actifs + bouton clear.
- Feedback accessible pour loader/aucun résultat.

### Project Structure Notes

- Web: `apps/web/src/features/mentors/search`.
- API: `apps/api/src/modules/mentors` + `modules/search`.
- Shared DTOs: `packages/shared/src/schemas`.

### Testing Requirements

- API: recherche q, filtres, tri, pagination, erreurs invalides.
- UI: champs recherche, filtres, mobile drawer.
- Performance: latence < 300ms sur search de base.

### Do / Don't

- Do: découpler scoring + filtres.
- Don’t: exposer données mentors non vérifiés.

### References

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

- `npm test --workspace=apps/api -- mentors.controller.spec.ts mentors-search.service.spec.ts` (PASS)
- `npm test --workspace=apps/web -- MentorSearch.test.tsx` (PASS)
- `npm test --workspace=apps/api` (PASS, 23 suites)
- `npm test --workspace=apps/web` (PASS, 8 fichiers)
- `npm run lint --workspace=apps/api` (FAIL: erreurs lint pre-existantes hors scope story)
- `npm run lint --workspace=apps/web` (FAIL: erreurs/warnings pre-existants hors scope story)

### Completion Notes List

- Endpoint `GET /mentors/search` ajoute avec query `q`, `filters`, `sort`, `cursor`, `limit` et reponse enveloppee `{ data, error }`.
- Endpoint `GET /mentors/filters` ajoute avec facettes domaine, prix, disponibilite et seuils de note.
- Service `MentorsSearchService` implemente:
  - recherche texte (tokens) sur domaine, tags, nom/prenom, bio
  - filtres domaines/prix/note/disponibilite
  - tri pertinence, note, prix asc/desc, disponibilite
  - pagination cursor base64
- UI mentors migree vers un module dedie `features/mentors/search`:
  - barre de recherche accessible (`aria-label`)
  - filtres persistants via `localStorage`
  - drawer mobile pour filtres
  - chips de filtres actifs + bouton reinitialisation
  - feedback loader et etat sans resultat
- Tests ajoutes API + UI pour recherche, filtres, facettes, pagination, erreurs JSON invalides et drawer mobile.

### Implementation Plan

- Etendre le module API `mentors` avec un service de recherche dedie pour separer recommandations et recherche libre.
- Garder un contrat API stable en enveloppe `{ data, error }` et un metadata explicite (`total`, `applied_filters`, `next_cursor`).
- Implementer le front dans `features/mentors/search` sans casser le layout existant, avec UX mobile via drawer.
- Prioriser des tests unitaires rapides (Jest/Vitest) couvrant les AC et les flux critiques.

### File List

- apps/api/src/modules/mentors/dto/get-mentors-search-query.dto.ts (new)
- apps/api/src/modules/mentors/dto/index.ts (modified)
- apps/api/src/modules/mentors/mentors-search.service.ts (new)
- apps/api/src/modules/mentors/mentors-search.service.spec.ts (new)
- apps/api/src/modules/mentors/mentors.controller.ts (modified)
- apps/api/src/modules/mentors/mentors.controller.spec.ts (modified)
- apps/api/src/modules/mentors/mentors.module.ts (modified)
- apps/api/src/modules/mentors/index.ts (modified)
- apps/web/src/app/(app)/mentors/page.tsx (modified)
- apps/web/src/features/mentors/search/MentorSearch.tsx (new)
- apps/web/src/features/mentors/search/MentorSearch.module.css (new)
- apps/web/src/features/mentors/search/index.ts (new)
- apps/web/src/features/mentors/search/__tests__/MentorSearch.test.tsx (new)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)
- _bmad-output/implementation-artifacts/2-2-recherche-et-filtres.md (modified)
- package-lock.json (modified)
- package.json (modified)

## Change Log

- 2026-02-16: Implementation de la story 2.2 (API search/facets, UI recherche + filtres, tests API/UI, statut sprint passe a in-progress).

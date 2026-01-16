# Story 2.2: Recherche et filtres

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want rechercher et filtrer les mentors,
so that trouver un mentor adapté à mes critères.

## Acceptance Criteria

1. Given un étudiant sur la page mentors When il applique des filtres (domaine, prix, note, disponibilité) Then la liste des mentors est mise à jour
2. Given un étudiant When il saisit une recherche Then les résultats sont filtrés selon la requête

## Tasks / Subtasks

- [ ] Exposer endpoint `GET /mentors/search` (query, filters, sort, pagination) (AC: #1, #2)
- [ ] Ajouter facettes côté API pour domaine, prix, disponibilité, note (AC: #1)
- [ ] Implémenter moteur de recherche full-text (Prisma + Postgres trigram) + filtres (AC: #1, #2)
- [ ] UI page mentors: barre recherche, filtres persistants (drawer sur mobile) (AC: #1, #2)
- [ ] Afficher résultats instantanés + loader + message sans résultat (AC: #2)
- [ ] Tests recherche/filtres API + UI (AC: #1, #2)

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

### Completion Notes List

### File List

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

- [ ] Implémenter l’API/logiciel correspondant (AC: #1)
- [ ] Implémenter l’UI/flux associé (AC: #1)
- [ ] Ajouter tests unitaires/integ (AC: #1)

## Dev Notes

- Stack: Next.js (front) + NestJS (API), TypeScript
- DB: PostgreSQL 17 + Prisma 7.2.0 (migrations Prisma)
- Auth: NextAuth 4.24.13 + JWT + RBAC
- API: REST + Swagger + WebSocket
- Conventions: snake_case DB, camelCase JSON, enveloppe {data, error}
- UX: responsive + WCAG 2.1 AA + pages publiques SEO
- Cible: modules matching/mentors
- Recherche + filtres UI

### Project Structure Notes

- Monorepo: `apps/web` (Next.js), `apps/api` (NestJS), `packages/shared`
- Feature-first dans `apps/api/src/modules` et `apps/web/src/features`
- Conventions: snake_case DB, camelCase JSON, endpoints pluriel

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

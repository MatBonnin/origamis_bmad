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

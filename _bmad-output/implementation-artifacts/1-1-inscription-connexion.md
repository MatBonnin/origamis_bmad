# Story 1.1: Inscription + connexion

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant/mentor,
I want créer un compte et me connecter,
so that accéder à la plateforme et mes fonctionnalités.

## Acceptance Criteria

1. Given un utilisateur non authentifié When il complète le formulaire d’inscription valide Then un compte est créé et l’utilisateur est connecté And il est redirigé vers son espace
2. Given un utilisateur existant When il saisit des identifiants valides Then il est authentifié et accède à son espace And une erreur claire s’affiche si les identifiants sont invalides

## Tasks / Subtasks

- [ ] Initialiser Next.js + NestJS (monorepo) (AC: #1)
- [ ] Installer dépendances et scripts (AC: #1)
- [ ] Vérifier lancement dev web/api (AC: #2)

## Dev Notes

- Stack: Next.js (front) + NestJS (API), TypeScript
- DB: PostgreSQL 17 + Prisma 7.2.0 (migrations Prisma)
- Auth: NextAuth 4.24.13 + JWT + RBAC
- API: REST + Swagger + WebSocket
- Conventions: snake_case DB, camelCase JSON, enveloppe {data, error}
- UX: responsive + WCAG 2.1 AA + pages publiques SEO
- Cible: modules auth, users, onboarding
- Contexte RGPD pour consentement

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

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

- [ ] Initialiser le monorepo Next.js + NestJS (si non fait) (AC: #1)
- [ ] Mettre en place Prisma + migrations et schéma minimal `users`, `roles`, `user_roles`, `sessions` (AC: #1)
- [ ] Créer le module `auth` côté API avec DTOs, validation et guards JWT (AC: #1, #2)
- [ ] Exposer endpoints REST auth (inscription, connexion, me) avec enveloppe `{ data, error }` (AC: #1, #2)
- [ ] Configurer NextAuth côté web (providers credentials + JWT) et intégration API (AC: #1, #2)
- [ ] Implémenter pages UI: inscription, connexion, erreurs, redirection (AC: #1, #2)
- [ ] Ajouter validation formulaire + messages d’erreur accessibles (AC: #1, #2)
- [ ] Ajouter rate limiting sur endpoints auth (AC: #1, #2)
- [ ] Tests API + UI pour inscription/connexion et erreurs (AC: #1, #2)

## Dev Notes

### Contexte et contraintes non negociables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0 (migrations Prisma).
- Auth: NextAuth 4.24.13 + JWT + RBAC (roles: etudiant, mentor, admin, support).
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` en DB, `camelCase` en JSON, endpoints pluriel.
- UX: responsive + WCAG 2.1 AA, pages publiques SEO.

### API Contracts (auth)

- `POST /auth/register` -> `{ data: { user, token }, error: null }`
- `POST /auth/login` -> `{ data: { user, token }, error: null }`
- `GET /auth/me` (JWT) -> `{ data: { user }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`

### Validation & UX

- Email valide, mot de passe avec politique minimale (longueur + complexite).
- Erreurs inline + resume en haut, focus sur premier champ invalide.
- `aria-live` pour feedback; labels explicites; cibles 44px+.
- Redirection apres succes: dashboard (zone app).

### Schéma de données (minimum)

- `users`: `id`, `email`, `password_hash`, `first_name`, `last_name`, `created_at`.
- `roles`: `id`, `name` (etudiant/mentor/admin/support).
- `user_roles`: `user_id`, `role_id`.
- `sessions` (si necessaire pour JWT refresh ou audit).

### Project Structure Notes

- Monorepo: `apps/web`, `apps/api`, `packages/shared`.
- Web: `apps/web/src/features/auth`, `apps/web/src/app/(public)`.
- API: `apps/api/src/modules/auth`, `apps/api/src/modules/users`.
- DTOs partages: `packages/shared/src/schemas`.

### Testing Requirements

- API: tests unitaires DTO/validation, tests integration `register/login`.
- Web: tests composants formulaire + erreurs + redirection.
- Lint et typecheck sans erreurs.

### Do / Don't

- Do: respecter App Router, conventions d'enveloppe et naming.
- Do: reutiliser les patterns existants (feature-first).
- Don't: creer un auth custom hors NextAuth.
- Don't: retourner des payloads non enveloppes.

### References

- _bmad-output/planning-artifacts/epics.md (Epic 1, Story 1.1)
- _bmad-output/planning-artifacts/prd.md (FR1, NFR sécurité/accessibilité)
- _bmad-output/planning-artifacts/architecture.md (stack, conventions, structure)
- _bmad-output/planning-artifacts/ux-design-specification.md (parcours onboarding/connexion, accessibilité)

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

### Completion Notes List

### File List

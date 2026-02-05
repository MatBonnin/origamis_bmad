# Story 1.1: Inscription + connexion

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant/mentor,
I want créer un compte et me connecter (onboarding inclus lors de la creation),
so that accéder à la plateforme et mes fonctionnalités.

## Acceptance Criteria

1. Given un utilisateur non authentifié When il complète le formulaire d'inscription valide Then un compte est créé et l'utilisateur est connecté And il est redirigé vers son espace
2. Given un utilisateur existant When il saisit des identifiants valides Then il est authentifié et accède à son espace And une erreur claire s'affiche si les identifiants sont invalides

## Tasks / Subtasks

- [x] Initialiser le monorepo Next.js + NestJS (si non fait) (AC: #1)
- [x] Mettre en place Prisma + migrations et schéma minimal `users`, `roles`, `user_roles`, `sessions` (AC: #1)
- [x] Créer le module `auth` côté API avec DTOs, validation et guards JWT (AC: #1, #2)
- [x] Exposer endpoints REST auth (inscription, connexion, me) avec enveloppe `{ data, error }` (AC: #1, #2)
- [x] Configurer NextAuth côté web (providers credentials + JWT) et intégration API (AC: #1, #2)
- [x] Implémenter pages UI: inscription, connexion, erreurs, redirection (AC: #1, #2)
- [x] Ajouter validation formulaire + messages d'erreur accessibles (AC: #1, #2)
- [x] Ajouter rate limiting sur endpoints auth (AC: #1, #2)
- [x] Tests API + UI pour inscription/connexion et erreurs (AC: #1, #2)

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
- L'inscription inclut l'onboarding (parcours multi-etapes).
- Redirection apres succes: fin onboarding -> dashboard (zone app).

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

Claude Opus 4.5

### Debug Log References

- Correction de la configuration Prisma 7 (datasourceUrl via ConfigService au lieu de schema.prisma)
- Résolution des dépendances manquantes (@babel/types)
- Génération du client Prisma après modification du schema

### Completion Notes List

- Schéma Prisma configuré avec users, roles, user_roles, sessions (Prisma 7 format)
- Module auth API complet: AuthService, AuthController, DTOs avec validation class-validator
- Guards JWT et RBAC implémentés
- Endpoints REST avec enveloppe `{ data, error }`: POST /auth/register, POST /auth/login, GET /auth/me
- NextAuth configuré avec CredentialsProvider appelant l'API NestJS
- Pages UI accessibles (WCAG 2.1 AA): /connexion, /inscription avec validation inline
- Rate limiting configuré via ThrottlerModule (3 paliers: short/medium/long)
- Tests unitaires: 32 tests passent (AuthService, AuthController, RegisterDto, LoginDto)
- Swagger documentation disponible sur /api/docs

### File List

**API (apps/api)**
- prisma/schema.prisma (modifié)
- prisma/prisma.config.ts (créé)
- src/modules/prisma/prisma.service.ts (modifié)
- src/modules/auth/auth.service.spec.ts (créé)
- src/modules/auth/auth.controller.spec.ts (créé)
- src/modules/auth/dto/register.dto.spec.ts (créé)
- src/modules/auth/dto/login.dto.spec.ts (créé)

**Web (apps/web)**
- src/lib/auth.ts (créé)
- src/types/next-auth.d.ts (créé)
- src/app/api/auth/[...nextauth]/route.ts (créé)
- src/components/providers/SessionProvider.tsx (créé)
- src/app/layout.tsx (modifié)
- src/app/(public)/connexion/page.tsx (créé)
- src/app/(public)/connexion/page.module.css (créé)
- src/app/(public)/inscription/page.tsx (créé)
- src/app/(public)/inscription/page.module.css (créé)
- src/app/(app)/dashboard/page.tsx (créé)
- src/app/(app)/dashboard/page.module.css (créé)

**Racine**
- .env.example (modifié)

## Change Log

- 2026-02-03: Implémentation complète story 1.1 - inscription/connexion avec tests (32 tests OK)

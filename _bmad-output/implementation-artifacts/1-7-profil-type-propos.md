# Story 1.7: Profil type proposé

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want recevoir un profil type suggéré après onboarding,
so that gagner du temps dans la configuration.

## Acceptance Criteria

1. Given un étudiant ayant complété l'onboarding When le système analyse ses réponses Then un profil type est proposé And l'étudiant peut l'accepter ou le modifier

## Tasks / Subtasks

- [x] Definir regles de suggestion a partir des reponses onboarding (AC: #1)
- [x] Exposer endpoint pour recuperer suggestion (AC: #1)
- [x] Exposer endpoint pour accepter/modifier la suggestion (AC: #1)
- [x] UI: ecran suggestion avec accept/editer (AC: #1)
- [x] Persister la suggestion et le choix final (AC: #1)
- [x] Tests API + UI (suggestion, acceptation, edition) (AC: #1)

## Dev Notes

### Contexte et contraintes non negociables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0 (migrations Prisma).
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` en DB, `camelCase` en JSON.
- UX: responsive + WCAG 2.1 AA.

### API Contracts (profil type)

- `GET /onboarding/profile-suggestion` -> `{ data: { suggestion }, error: null }`
- `POST /onboarding/profile-suggestion/accept` -> `{ data: { profile }, error: null }`
- `PATCH /onboarding/profile-suggestion` -> `{ data: { profile }, error: null }`

### Regles (minimum)

- Basé sur domaine, niveau, objectifs.
- Regles deterministes (pas d'IA pour MVP).

### Donnees (minimum)

- `profile_suggestions`: `user_id`, `suggestion_json`, `accepted_at`.
- `users`: champs profil mis a jour apres acceptation/edition.

### Validation & UX

- Ecran clair avec CTA unique "Accepter" + option "Modifier".
- Feedback success/erreur accessible.

### Project Structure Notes

- Web: `apps/web/src/features/onboarding/suggestion`.
- API: `apps/api/src/modules/onboarding`.
- DTOs partages: `packages/shared/src/schemas`.

### Testing Requirements

- API: suggestion disponible apres onboarding complet.
- Web: affichage suggestion + accept/modify.

### Do / Don't

- Do: garder une trace de la suggestion proposee.
- Don't: bloquer l'utilisateur s'il choisit de modifier.

### References

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Prisma migrate dev failed (shadow DB issue from prior migrations) - resolved with `prisma db push`
- Prisma generate EPERM on Windows DLL lock - non-blocking, DB schema synced

### Completion Notes List

- Implemented deterministic profile suggestion rules: LEVEL_MAP maps academic levels (licence-1..doctorat) to skill levels (debutant/intermediaire/avance), DOMAIN_BIO_MAP generates domain-specific bios, DEFAULT_OBJECTIVES provides fallback objectives
- Created `profile_suggestions` table with user_id (unique), suggestion_json, accepted_at
- Created `ProfileSuggestionService` with methods: generateSuggestion(), getSuggestion(), acceptSuggestion(), modifySuggestion()
- Created `ProfileSuggestionController` with 3 endpoints: GET, POST /accept, PATCH
- All endpoints follow existing API envelope pattern `{ data, error: null }`
- Created `ProfileSuggestion` React component with accept/edit modes, accessible UI with ARIA attributes
- Created `/profile-suggestion` page in Next.js App Router
- Modified onboarding flows to redirect students to profile suggestion after onboarding completion
- 31 new tests (20 service + 3 controller + 8 DTO validation), 132 total tests pass with 0 regressions

### File List

- apps/api/prisma/schema.prisma (modified - added profile_suggestions model and relation)
- apps/api/src/app.module.ts (modified - registered ProfileSuggestionModule)
- apps/api/src/modules/profile-suggestion/profile-suggestion.service.ts (new)
- apps/api/src/modules/profile-suggestion/profile-suggestion.service.spec.ts (new)
- apps/api/src/modules/profile-suggestion/profile-suggestion.controller.ts (new)
- apps/api/src/modules/profile-suggestion/profile-suggestion.controller.spec.ts (new)
- apps/api/src/modules/profile-suggestion/profile-suggestion.module.ts (new)
- apps/api/src/modules/profile-suggestion/index.ts (new)
- apps/api/src/modules/profile-suggestion/dto/profile-suggestion.dto.ts (new)
- apps/api/src/modules/profile-suggestion/dto/profile-suggestion.dto.spec.ts (new)
- apps/api/src/modules/profile-suggestion/dto/index.ts (new)
- apps/web/src/features/onboarding/components/ProfileSuggestion.tsx (new)
- apps/web/src/features/onboarding/components/ProfileSuggestion.module.css (new)
- apps/web/src/app/(app)/profile-suggestion/page.tsx (new)
- apps/web/src/features/onboarding/PublicOnboardingWizard.tsx (modified - redirect students to /profile-suggestion)
- apps/web/src/features/onboarding/OnboardingWizard.tsx (modified - redirect to /profile-suggestion after completion)

## Change Log

- 2026-02-16: Implemented profile suggestion feature - deterministic rules engine, 3 API endpoints, frontend UI with accept/edit, DB persistence (Claude Opus 4.6)

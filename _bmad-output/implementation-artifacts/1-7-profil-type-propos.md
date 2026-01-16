# Story 1.7: Profil type proposé

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want recevoir un profil type suggéré après onboarding,
so that gagner du temps dans la configuration.

## Acceptance Criteria

1. Given un étudiant ayant complété l’onboarding When le système analyse ses réponses Then un profil type est proposé And l’étudiant peut l’accepter ou le modifier

## Tasks / Subtasks

- [ ] Definir regles de suggestion a partir des reponses onboarding (AC: #1)
- [ ] Exposer endpoint pour recuperer suggestion (AC: #1)
- [ ] Exposer endpoint pour accepter/modifier la suggestion (AC: #1)
- [ ] UI: ecran suggestion avec accept/editer (AC: #1)
- [ ] Persister la suggestion et le choix final (AC: #1)
- [ ] Tests API + UI (suggestion, acceptation, edition) (AC: #1)

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

GPT-5 (Codex)

### Debug Log References

### Completion Notes List

### File List

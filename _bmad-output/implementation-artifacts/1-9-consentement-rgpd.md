# Story 1.9: Consentement RGPD

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a utilisateur,
I want donner et gérer mon consentement RGPD,
so that contrôler l’usage de mes données.

## Acceptance Criteria

1. Given un utilisateur lors de l’inscription When il accepte les conditions de consentement Then son consentement est enregistré
2. Given un utilisateur authentifié When il retire son consentement Then le retrait est enregistré And l’utilisateur est informé des impacts

## Tasks / Subtasks

- [ ] Ajouter schema consentement (version, dates) via Prisma migration (AC: #1, #2)
- [ ] Enregistrer consentement a l'inscription (AC: #1)
- [ ] Exposer endpoints REST lecture/retire consentement (AC: #2)
- [ ] UI: checkbox consentement + page gestion (AC: #1, #2)
- [ ] Definir impact du retrait (blocage fonctionnalites ou mode restreint) (AC: #2)
- [ ] Tests API + UI (enregistrement, retrait, message impact) (AC: #1, #2)

## Dev Notes

### Contexte et contraintes non negociables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0 (migrations Prisma).
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` en DB, `camelCase` en JSON.
- UX: responsive + WCAG 2.1 AA.

### API Contracts (consentement)

- `GET /users/me/consent` -> `{ data: { consent }, error: null }`
- `POST /users/me/consent` -> `{ data: { consent }, error: null }`
- `POST /users/me/consent/withdraw` -> `{ data: { consent }, error: null }`

### Donnees (minimum)

- `consents`: `user_id`, `consent_version`, `consented_at`, `withdrawn_at`.
- Conventions `snake_case`.

### Impact retrait

- Informer l'utilisateur des impacts (message explicite).
- En mode retrait, bloquer: matching, messagerie, RDV, notifications.
- Autoriser: consultation compte, telechargement donnees, demande suppression.

### Validation & UX

- Checkbox consentement obligatoire a l'inscription (avec lien politique).
- Message clair lors du retrait, `aria-live` pour feedback.

### Project Structure Notes

- Web: `apps/web/src/features/settings/consent`.
- API: `apps/api/src/modules/users` ou `modules/compliance`.
- DTOs partages: `packages/shared/src/schemas`.

### Testing Requirements

- API: consent create/withdraw, auth required.
- Web: affichage statut + confirmation retrait + message impact.

### Do / Don't

- Do: stocker la version du texte de consentement.
- Don't: supprimer les preuves de consentement.

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

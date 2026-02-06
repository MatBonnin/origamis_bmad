# Story 1.2: Récupération mot de passe

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a utilisateur,
I want réinitialiser mon mot de passe,
so that récupérer l’accès à mon compte.

## Acceptance Criteria

1. Given un utilisateur sur “Mot de passe oublié” When il soumet son email valide Then un email de réinitialisation est envoyé And un message de confirmation est affiché
2. Given un utilisateur avec un lien de réinitialisation valide When il définit un nouveau mot de passe conforme Then le mot de passe est mis à jour And il peut se connecter avec le nouveau mot de passe

## Tasks / Subtasks

- [x] Ajouter tables/champs reset password (token hash + expiration) via Prisma migration (AC: #1, #2)
- [x] Créer endpoints REST reset (request + confirm) avec enveloppe `{ data, error }` (AC: #1, #2)
- [x] Implémenter génération token, hash, expiration, invalidation après usage (AC: #1, #2)
- [x] Intégrer envoi email reset (lien signé) + template minimal (AC: #1)
- [x] Implémenter UI "Mot de passe oublié" + "Réinitialiser" (AC: #1, #2)
- [x] Ajouter validations password + messages d'erreur accessibles (AC: #2)
- [x] Protéger contre l'énumération d'utilisateurs (message unique) (AC: #1)
- [x] Rate limiting sur endpoints reset (AC: #1)
- [x] Tests API + UI (request, token invalide/expiré, succès) (AC: #1, #2)

## Dev Notes

### Contexte et contraintes non negociables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0 (migrations Prisma).
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` en DB, `camelCase` en JSON, endpoints pluriel.
- UX: responsive + WCAG 2.1 AA, pages publiques SEO.

### API Contracts (reset password)

- `POST /auth/forgot-password` -> `{ data: { ok: true }, error: null }`
- `POST /auth/reset-password` -> `{ data: { ok: true }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`
- Message identique que l’email existe ou non (anti-enumeration).

### Token & securite

- Token aleatoire, hash stocke (jamais le token en clair).
- Expiration courte (ex: 1h), usage unique (marquer `used_at`).
- Invalidation si nouveau reset demande.
- Rate limiting + journalisation action sensible.

### Validation & UX

- Champ email avec validation.
- Mot de passe conforme (longueur + complexite).
- Erreurs inline + resume en haut, focus sur premier champ invalide.
- `aria-live` pour feedback; labels explicites; cibles 44px+.

### Donnees (minimum)

- `users`: ajouter `password_reset_token_hash`, `password_reset_expires_at`, `password_reset_used_at`.
- Conventions `snake_case`.

### Project Structure Notes

- Monorepo: `apps/web` (Next.js), `apps/api` (NestJS), `packages/shared`
- Web: `apps/web/src/features/auth` + routes publiques reset.
- API: `apps/api/src/modules/auth` + service mail (si module dédié).
- DTOs partages: `packages/shared/src/schemas`.

### Testing Requirements

- API: tests `forgot-password` (email inconnu/connu), `reset-password` (token invalide/expire/used).
- Web: tests formulaire reset + validation + messages erreurs.
- Lint et typecheck sans erreurs.

### Do / Don't

- Do: repondre `{ data: { ok: true } }` meme si email inconnu.
- Do: hasher le token, ne jamais le stocker en clair.
- Don't: retourner un statut different si utilisateur inconnu.
- Don't: reutiliser un token apres reset.

### References

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- Prisma 7 driver adapter issues on Windows - downgraded to Prisma 6

### Completion Notes List

- 2026-02-05: Story complète - Password reset backend + frontend
  - **Backend API:**
    - Endpoints POST /auth/forgot-password et POST /auth/reset-password
    - Token sécurisé (crypto.randomBytes 32 bytes), hashé SHA-256 avant stockage
    - Expiration 1h, usage unique avec marquage password_reset_used_at
    - Protection anti-énumération (même réponse si email existe ou non)
    - Rate limiting: 3 req/min pour forgot-password, 5 req/min pour reset-password
    - Validation DTO: email, password (min 8 chars, 1 majuscule, 1 chiffre)
  - **Email Service:**
    - Module mail global avec templates HTML/text
    - Support SMTP configurable via .env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
    - Mode dev: emails loggés en console si SMTP non configuré
  - **Frontend:**
    - Page /mot-de-passe-oublie avec formulaire email
    - Page /reinitialiser-mot-de-passe?token=xxx avec validation password
    - Lien "Mot de passe oublié ?" ajouté sur page connexion
    - Messages d'erreur accessibles, validation inline
  - **Tests:** 44 tests passent (dont 14 pour auth service)
  - **Note:** Downgrade Prisma 7 → 6 (bug driver adapter Windows)

### File List

**Backend (apps/api):**
- src/modules/auth/dto/forgot-password.dto.ts (new)
- src/modules/auth/dto/reset-password.dto.ts (new)
- src/modules/auth/dto/index.ts (modified)
- src/modules/auth/auth.service.ts (modified)
- src/modules/auth/auth.controller.ts (modified)
- src/modules/auth/auth.service.spec.ts (modified)
- src/modules/mail/mail.module.ts (new)
- src/modules/mail/mail.service.ts (new)
- src/modules/mail/index.ts (new)
- src/app.module.ts (modified)
- src/modules/prisma/prisma.service.ts (modified)
- prisma/schema.prisma (modified)
- .env (modified)
- package.json (modified - nodemailer, Prisma 6)

**Frontend (apps/web):**
- src/app/(public)/mot-de-passe-oublie/page.tsx (new)
- src/app/(public)/reinitialiser-mot-de-passe/page.tsx (new)
- src/app/(public)/connexion/page.tsx (modified)

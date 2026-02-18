# Story 3.8: Historique des sessions

Status: review

<!-- Note: Validation is optional. Run validate-create-story pour quality check before dev-story. -->

## Story

As a utilisateur,
I want consulter l’historique des sessions,
so that suivre mes échanges passés.

## Acceptance Criteria

1. Given un utilisateur authentifié When il consulte son historique Then la liste des sessions passées est affichée

## Tasks / Subtasks

- [x] Endpoint `GET /sessions/history?user_id=` (pagination + filters) (AC: #1)
- [x] Ajouter export (PDF/CSV) + lien de replay (si dispo) (AC: #1)
- [x] UI historique: timeline, filtre par type (message, RDV, visio) (AC: #1)
- [x] Relier aux logs (message, booking) + respect RGPD (AC: #1)
- [x] Tests API + UI + access (AC: #1)

## Dev Notes

### Contexte et contraintes non negociables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC.
- API: REST + Swagger, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: modules messaging + scheduling.
- WebSocket pour notifications.

### API Contracts (historique)

- `GET /sessions/history?user_id=&category=&cursor=` -> `{ data: { sessions, metadata }, error: null }`
- `GET /sessions/:id/replay-link` -> `{ data: { url }, error: null }`
- `POST /sessions/history/export` -> `{ data: { export_url }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `sessions`: `id`, `booking_id`, `user_id`, `mentor_id`, `type`, `started_at`, `ended_at`, `notes`.
- `session_history_events`: `session_id`, `event_type`, `payload`, `created_at`.
- `replays`: `session_id`, `url`, `stored_at`.
- Respect RGPD: anonymiser après suppression request.
- Conventions `snake_case`.

### UX & accessibilité

- Timeline view, filtres par type (message/RDV/visio).
- `aria-live` for updates, accessible keyboard nav.
- Export: CTA accessible, instructions.
- Indicateur de statut (completed, cancelled).

### Integration & monitoring

- Liens vers messages/notifications (3-1/3-3).
- Replay link (if recorded) accessible until expiration.
- Audit logs for session access (RGPD).

### Testing Requirements

- API: pagination, filters, export, access control.
- UI: timeline, filters, export buttons.
- Security: ensure access only to owner.

### Do / Don’t

- Do: cacher l’historique si user demande anonymisation (RGPD).
- Do: loguer access pour audits.
- Don’t: afficher liens replay après expiration.

### Project Structure Notes

- Web: `apps/web/src/features/sessions/history`.
- API: `apps/api/src/modules/sessions`.
- Shared DTOs: `packages/shared/src/schemas`.

### References

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

- Implémentation API `GET /sessions/history` avec pagination cursor-based (`cursor`, `limit`) et filtres (`category`: `message|rdv|visio`).
- Contrôle d'accès propriétaire appliqué: blocage si `user_id` diffère de l'utilisateur authentifié.
- Validation exécutée: tests ciblés sessions + suite Jest API complète (`--runInBand`) passants.
- Export/replay valides: POST /sessions/history/export + GET /sessions/:id/replay-link (controle acces + expiration).
- UI validee: timeline + filtres + export + replay conditionnel + aria-live, avec tokens CSS design system.
- Validation: API ciblee (14/14), Web ciblee (3/3), regression API (276/276), regression Web (69/69).

### Completion Notes List

- ✅ Tâche 1 livrée: endpoint historique disponible via `apps/api/src/modules/sessions/sessions.controller.ts`.
- ✅ Service associé créé avec normalisation de la réponse `{ sessions, metadata }` et enveloppe API `{ data, error }`.
- ✅ Tests ajoutés/renforcés (controller + service) couvrant pagination, filtres et sécurité d'accès.
- Done: Export CSV/PDF livre avec URL data (exportUrl / export_url).
- Done: Replay visio livre avec verification participant + expiration.
- Done: UI historique finalisee (timeline, filtres par type, CTA export, replay conditionnel).
- Done: Logs d'audit et contrainte RGPD verifies (historique masque si consentement retire).
- Done: Correction lint React dans la feature (&apos;) et tests relances avec succes.

### File List

- apps/api/src/modules/sessions/sessions.controller.ts
- apps/api/src/modules/sessions/sessions.service.ts
- apps/api/src/modules/sessions/sessions.module.ts
- apps/api/src/modules/sessions/index.ts
- apps/api/src/modules/sessions/sessions.controller.spec.ts
- apps/api/src/modules/sessions/sessions.service.spec.ts
- apps/api/src/app.module.ts
- apps/api/package.json
- apps/api/src/test-shims/nestjs-websockets.ts
- apps/api/src/test-shims/socket-io.ts
- apps/web/src/app/(app)/sessions/history/page.tsx
- apps/web/src/features/sessions/history/SessionHistory.tsx
- apps/web/src/features/sessions/history/SessionHistory.module.css
- apps/web/src/features/sessions/history/__tests__/SessionHistory.test.tsx
- apps/web/src/features/sessions/history/index.ts
- apps/web/src/features/sessions/index.ts

## Change Log

- 2026-02-18: Story 3.8 finalisee (export CSV/PDF, replay visio, UI timeline + filtres, logs/RGPD, tests API/Web).



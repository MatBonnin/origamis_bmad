# Story 6.2: Validation des mentors

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a admin,
I want vérifier/valider un profil mentor,
so that garantir la qualité des mentors.

## Acceptance Criteria

1. Given un mentor en attente de validation When l’admin valide le profil Then le mentor devient visible et actif

- [ ] Créer workflow validation (awaited mentors en `pending_review`) (AC: #1)
- [ ] Endpoint admin `POST /mentors/:id/validate`, `PATCH /mentors/:id/status` (AC: #1)
- [ ] UI admin (liste mentors en attente, preview profil, actions) (AC: #1)
- [ ] Vérifier critères (documents, avis, compliance) + notifications (AC: #1)
- [ ] Tests API + UI + alerts (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC (admin).
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: reviews + admin.
- Mentors en `pending_review` jusqu’à validation.

### API Contracts (validation)

- `POST /mentors/:id/validate` -> `{ data: { mentor }, error: null }`
- `PATCH /mentors/:id/status` -> `{ data: { mentor }, error: null }`
- `GET /mentors/pending` -> `{ data: { mentors }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `mentor_validation_checks`: `mentor_id`, `status`, `checked_by`, `notes`.
- `mentor_documents`: `mentor_id`, `type`, `url`, `uploaded_at`.
- `mentor_status`: `pending`, `validated`, `rejected`.
- Conventions `snake_case`.

### UX & compliance

- Vue admin liste mentors, preview, statuts (pending, rejected).
- Accessibilité: focus sur actions, confirmations modales.
- Document checklist visible.
- Notifications (email/push) sur validation/rejet.

### Workflow & notifications

- Générer événements pour notifications + audits.
- Rejeter mentors (messages instructifs).
- Stocker logs (actions).

### Testing Requirements

- API: validation success, rejection, RBAC.
- UI: actions modales, preview documents.
- Integration: notifications triggered.

### Do / Don’t

- Do: document raisons en cas de rejet.
- Do: conserver logs pour audits RGPD.
- Don’t: exposer mentors non validés à la recherche.

### Project Structure Notes

- Web: `apps/web/src/features/admin/mentor-validation`.
- API: `apps/api/src/modules/mentor-validation`.
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

### Completion Notes List

### File List

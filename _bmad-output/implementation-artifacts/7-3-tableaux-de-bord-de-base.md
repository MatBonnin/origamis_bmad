# Story 7.3: Tableaux de bord de base

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a admin,
I want accÃ©der Ã  des tableaux de bord (matching, usage),
so that suivre lâ€™activitÃ© globale.

## Acceptance Criteria

1. Given un admin authentifiÃ© When il consulte le dashboard Then des indicateurs de base sont affichÃ©s

- [x] Endpoint `GET /analytics/dashboard?type=` (matching, usage, incidents) (AC: #1)
- [x] AgrÃ©gations Prisma/SQL + cache (AC: #1)
- [x] UI dashboards: charts, cards, filters, segmentation (AC: #1)
- [x] Export CSV/PDF + schedule reports (AC: #1)
- [x] Tests API + reporting + UI (AC: #1)

## Dev Notes

### Contexte et contraintes non negotiables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC (admin/support).
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA.
- Cible: admin/support/analytics.
- Support RGPD, exports loggÃ©s.

### API Contracts (dashboards)

- `GET /analytics/dashboard?type=` -> `{ data: { metrics, metadata }, error: null }`
- `POST /analytics/reports` -> `{ data: { report_id }, error: null }`
- `GET /analytics/reports/:id` -> `{ data: { report }, error: null }`
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `analytics_snapshots`: `type`, `payload_json`, `created_at`.
- `analytics_reports`: `id`, `type`, `status`, `generated_at`.
- `audit_reports`: `report_id`, `requested_by`, `status`.
- Conventions `snake_case`.

### UX & accessibilitÃ©

- Dashboards with cards, charts (bar, line, pie), filter ribbons.
- Accessible legend, `aria-live` updates, keyboard nav.
- Export buttons with aria labels.

### Integration & monitoring

- Schedule nightly exports, send notifications on anomalies.
- Feed from matching/reviews/incidents data.
- Provide drilldown & link to logs.

### Testing Requirements

- API: metrics, filters, exports, caching.
- UI: charts, filters, export modal.
- Performance: response < 500ms for base metrics.

### Do / Donâ€™t

- Do: respect RBAC (only admin/support view).
- Do: log exports for compliance.
- Donâ€™t: show sensitive PII.

- Web: `apps/web/src/features/analytics`.
- API: `apps/api/src/modules/analytics`.
- Shared DTOs: `packages/shared/src/schemas`.

### References

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

- _bmad-output/planning-artifacts/epics.md
- _bmad-output/planning-artifacts/prd.md
- _bmad-output/planning-artifacts/architecture.md
- _bmad-output/planning-artifacts/ux-design-specification.md

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

- npm test -- --runInBand modules/admin modules/users modules/support modules/analytics (apps/api)
- npm test -- src/features/analytics/dashboard/__tests__/AnalyticsDashboard.test.tsx (apps/web)

### Completion Notes List

- Creation du module API `analytics` avec endpoints `GET /analytics/dashboard`, `POST /analytics/reports`, `GET /analytics/reports/:id`.
- Ajout d agregations de base (users, mentors valides, bookings, messages) avec cache court.
- Ajout generation de rapports CSV/PDF (data URL) et consultation des rapports.
- Ajout de l UI `AnalyticsDashboard` (cards, filtre type, export CSV/PDF) et page `/admin/analytics`.

### File List

- apps/api/src/modules/analytics/analytics.module.ts
- apps/api/src/modules/analytics/analytics.controller.ts
- apps/api/src/modules/analytics/analytics.service.ts
- apps/api/src/modules/analytics/analytics.controller.spec.ts
- apps/api/src/modules/analytics/analytics.service.spec.ts
- apps/api/src/modules/analytics/index.ts
- apps/web/src/features/analytics/dashboard/AnalyticsDashboard.tsx
- apps/web/src/features/analytics/dashboard/AnalyticsDashboard.module.css
- apps/web/src/features/analytics/dashboard/index.ts
- apps/web/src/features/analytics/dashboard/__tests__/AnalyticsDashboard.test.tsx
- apps/web/src/app/(app)/admin/analytics/page.tsx

### Change Log

- 2026-02-18: Livraison story 7.3 (dashboard analytics + exports + tests).

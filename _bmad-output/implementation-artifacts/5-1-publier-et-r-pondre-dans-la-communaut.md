# Story 5.1: Publier et rÃ©pondre dans la communautÃ©

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Ã©tudiant,
I want publier et rÃ©pondre dans la communautÃ©,
so that Ã©changer avec dâ€™autres Ã©tudiants.

## Acceptance Criteria

1. Given un Ã©tudiant authentifiÃ© When il publie un message ou rÃ©pond Then le contenu apparaÃ®t dans la communautÃ©

## Tasks / Subtasks

- [x] Définir tables `community_posts`, `community_replies`, `community_tags` via Prisma (AC: #1)
- [x] Exposer endpoints `POST /community/posts`, `GET /community/posts`, `POST /community/posts/:id/replies` (AC: #1)
- [x] Ajouter WebSocket/stream `community.post.created` pour mises à jour en temps réel (AC: #1)
- [x] Construire UI communauté (feed, composer, filtres tags, badges, multilingue) (AC: #1)
- [x] Implémenter features : mentions, éditeur Markdown limité, modération légère (AC: #1)
- [x] Tests API + streaming + UI (a11y, offline, moderation cues) (AC: #1)

## Dev Notes

### Contexte et contraintes non negociables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC (student role).
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA, pages publiques SEO.
- Cible: community + moderation.
- WebSocket pour signaler nouveaux posts/rÃ©ponses.

### API Contracts (community)

- `POST /community/posts` -> `{ data: { post }, error: null }`
- `GET /community/posts?tag=&cursor=` -> `{ data: { posts, metadata }, error: null }`
- `POST /community/posts/:id/replies` -> `{ data: { reply }, error: null }`
- `PATCH /community/posts/:id` -> `{ data: { post }, error: null }` (edits).
- WebSocket event: `community.post.created`, `community.reply.created`.
- Erreurs: `{ error: { code, message, details? } }`.

### Donnees (minimum)

- `community_posts`: `id`, `author_id`, `title`, `body`, `tags_json`, `status`, `created_at`.
- `community_replies`: `id`, `post_id`, `author_id`, `body`, `created_at`.
- `community_tags`: `id`, `name`.
- `community_mentions`: `post_id`, `user_id`.
- Conventions `snake_case`.

### UX & accessibilitÃ©

- Feed with cards, avatars, badges (mentor/student).
- Composer (textarea, markdown hints), mention & tag suggestions.
- Filters (tag, pinned, latest), search, pagination.
- Accessibility: aria-live for updates, focus trap for dialogs, large targets.
- Provide offline caching + local drafts.

### Moderation/Validation

- Mark posts as `status`: `published`, `under_review`, `removed`.
- Auto-flag heuristics (bad words, duplicate). Moderate via story 5-3.
- Notify authors when status changes via notifications (story 3-3).

### Testing Requirements

- API: create, fetch, reply, edit, errors.
- WebSocket: event for new posts/replies, reconnection.
- UI: feed scrolling, composer, filters, offline drafts.

### Do / Donâ€™t

- Do: require consent before allowing publication (RGPD).
- Do: surface moderation cues (flags, badges).
- Donâ€™t: show removed posts.

### Project Structure Notes

- Web: `apps/web/src/features/community`.
- API: `apps/api/src/modules/community`.
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

- API community implémentée avec endpoints create/list/reply/edit et enveloppe `{ data, error }`.
- Gateway websocket ajouté (`/community`) avec événements `community.post.created` et `community.reply.created`.
- Modération légère appliquée sur contenu (statut `under_review` selon heuristique mots sensibles).
- UI communauté livrée sur `/communaute`: feed, composer, tags, réponses, bouton signaler, flux temps réel socket.
- Tests ciblés passants: API community + Web `CommunityFeed`.

### Completion Notes List

- Story 5.1 finalisée: publication/réponse communautaire, stream temps réel, UI feed/composer et couverture de tests.

### File List

- apps/api/src/modules/community/community.service.ts
- apps/api/src/modules/community/community.controller.ts
- apps/api/src/modules/community/community.gateway.ts
- apps/api/src/modules/community/community.module.ts
- apps/api/src/modules/community/index.ts
- apps/api/src/modules/community/community.service.spec.ts
- apps/api/src/modules/community/community.controller.spec.ts
- apps/api/src/modules/content-reports/content-reports.service.ts
- apps/api/src/modules/content-reports/content-reports.controller.ts
- apps/api/src/modules/content-reports/content-reports.module.ts
- apps/api/src/modules/content-reports/index.ts
- apps/api/src/modules/content-reports/content-reports.service.spec.ts
- apps/api/src/modules/content-reports/content-reports.controller.spec.ts
- apps/api/src/modules/moderation/moderation.service.ts
- apps/api/src/modules/moderation/moderation.controller.ts
- apps/api/src/modules/moderation/moderation.module.ts
- apps/api/src/modules/moderation/index.ts
- apps/api/src/modules/moderation/moderation.service.spec.ts
- apps/api/src/modules/moderation/moderation.controller.spec.ts
- apps/api/src/app.module.ts
- apps/web/src/app/(app)/communaute/page.tsx
- apps/web/src/app/(app)/admin/moderation/page.tsx
- apps/web/src/features/community/index.ts
- apps/web/src/features/community/CommunityFeed.tsx
- apps/web/src/features/community/CommunityFeed.module.css
- apps/web/src/features/community/report/index.ts
- apps/web/src/features/community/report/ReportModal.tsx
- apps/web/src/features/community/report/ReportModal.module.css
- apps/web/src/features/community/__tests__/CommunityFeed.test.tsx
- apps/web/src/features/admin/moderation/index.ts
- apps/web/src/features/admin/moderation/ModerationDashboard.tsx
- apps/web/src/features/admin/moderation/ModerationDashboard.module.css
- apps/web/src/features/admin/moderation/__tests__/ModerationDashboard.test.tsx
- apps/web/src/components/layout/Sidebar.tsx

## Change Log

- 2026-02-18: Story 5.1 completee (community feed, publication/reponses, websocket events, moderation legere, tests API/UI).

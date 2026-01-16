# Story 5.1: Publier et répondre dans la communauté

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a étudiant,
I want publier et répondre dans la communauté,
so that échanger avec d’autres étudiants.

## Acceptance Criteria

1. Given un étudiant authentifié When il publie un message ou répond Then le contenu apparaît dans la communauté

## Tasks / Subtasks

- [ ] Définir tables `community_posts`, `community_replies`, `community_tags` via Prisma (AC: #1)
- [ ] Exposer endpoints `POST /community/posts`, `GET /community/posts`, `POST /community/posts/:id/replies` (AC: #1)
- [ ] Ajouter WebSocket/stream `community.post.created` pour mises à jour en temps réel (AC: #1)
- [ ] Construire UI communauté (feed, composer, filtres tags, badges, multilingue) (AC: #1)
- [ ] Implémenter features : mentions, éditeur Markdown limité, modération légère (AC: #1)
- [ ] Tests API + streaming + UI (a11y, offline, moderation cues) (AC: #1)

## Dev Notes

### Contexte et contraintes non negociables

- Stack: Next.js (App Router) + NestJS, TypeScript.
- DB: PostgreSQL 17 + Prisma 7.2.0.
- Auth: NextAuth 4.24.13 + JWT + RBAC (student role).
- API: REST + Swagger + WebSocket, enveloppe `{ data, error }`.
- Conventions: `snake_case` DB, `camelCase` JSON.
- UX: responsive + WCAG 2.1 AA, pages publiques SEO.
- Cible: community + moderation.
- WebSocket pour signaler nouveaux posts/réponses.

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

### UX & accessibilité

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

### Do / Don’t

- Do: require consent before allowing publication (RGPD).
- Do: surface moderation cues (flags, badges).
- Don’t: show removed posts.

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

### Completion Notes List

### File List

### Project Structure Notes

- Monorepo: `apps/web` (Next.js), `apps/api` (NestJS), `packages/shared`
- Feature-first dans `apps/api/src/modules` et `apps/web/src/features`
- Conventions: snake_case DB, camelCase JSON, endpoints pluriel

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

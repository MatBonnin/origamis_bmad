# Story 8.6: Fiabilisation persistance confiance

Status: review

## Story

As a admin/support,
I want persister validation, visibilite et avis en base,
so that garantir stabilite et auditabilite apres redemarrage.

## Acceptance Criteria

1. Given une validation mentor appliquee When redemarrage service Then le statut est conserve.
2. Given une regle de visibilite appliquee When redemarrage service Then la recherche applique la meme regle.
3. Given des avis publies/moderes When redemarrage service Then profil public et notation restent coherents.
4. Given un audit admin When historique consulte Then chaque action sensible est tracable.

## Tasks / Subtasks

- [x] Retirer etat memoire admin (AC: #1, #2)
  - [x] remplacer Maps de `MentorsAdminService` par requetes Prisma
- [x] Persister flux avis (AC: #3)
  - [x] utiliser `mentor_reviews`, `mentor_ratings` comme source de verite
- [x] Aligner services dependants (AC: #2, #3)
  - [x] recherche/profil/boards admin lisent DB uniquement
- [x] Audit/log (AC: #4)
  - [x] tracer validation, rejet, visibilite, moderation avis
- [x] Tests (AC: #1, #2, #3, #4)
  - [x] tests redemarrage (state reload)
  - [x] tests integration bout-en-bout

## Dev Notes

### Technical Risks

- regression sur search et pending mentors si fallback memoire reste actif
- divergence rating calculee vs rating persiste

### Migration Strategy

- feature flag de bascule memoire->DB si besoin
- script de backfill des enregistrements temporaires si existants

### References

- `apps/api/src/modules/mentors/mentors-admin.service.ts`
- `apps/api/src/modules/mentors/mentors-profile.service.ts`
- `apps/api/prisma/schema.prisma`

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

### Completion Notes List

- Story implementee (API/Web/tests selon perimetre).

### File List

- Voir les fichiers modifies dans le diff Git.


# Story 8.4: Parametrage d'offre mentor

Status: ready-for-dev

## Story

As a mentor,
I want definir mon type d'accompagnement,
so that controler mon positionnement et mon modele.

## Acceptance Criteria

1. Given un mentor authentifie When il configure `supportTypes[]` (`ponctuel`, `suivi_regulier`, `long_uniquement`) Then la configuration est persistee.
2. Given un etudiant en recherche When il applique un filtre support Then les resultats sont filtres correctement.
3. Given un profil mentor public When il est consulte Then les types d'accompagnement sont visibles.
4. Given valeurs invalides ou doublons When sauvegarde Then erreur metier explicite.

## Tasks / Subtasks

- [ ] Schema & migration (AC: #1, #3)
  - [ ] Ajouter `support_types` sur `mentor_profiles`
- [ ] API self-service/public/recherche (AC: #1, #2, #3, #4)
  - [ ] Etendre DTO
  - [ ] Exposer champ dans profil public
  - [ ] Ajouter filtre dans `GET /mentors/search` et facettes
- [ ] UI mentor/etudiant (AC: #1, #2, #3)
  - [ ] Checkbox group dans `MentorSettings`
  - [ ] filtre cote recherche mentors
- [ ] Tests (AC: #1, #2, #3, #4)
  - [ ] unit/integration API
  - [ ] UI filtre + rendu profil

## Dev Notes

### API Contracts

- `PATCH /mentors/me` add `supportTypes?: string[]`
- `GET /mentors/search` filter add `supportTypes?: string[]`
- `GET /mentors/filters` facets add support types

### Validation Rules

- au moins 1 type requis pour publication
- valeurs autorisees strictes
- max 3 valeurs

### Out of Scope

- pricing par support type

### References

- `apps/api/src/modules/mentors/mentors-search.service.ts`
- `apps/web/src/features/mentors/search/MentorSearch.tsx`

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

### Completion Notes List

### File List

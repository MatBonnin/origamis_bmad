# Story 8.5: Gating strict publication mentor

Status: ready-for-dev

## Story

As a mentor,
I want connaitre les prerequis de publication de mon profil,
so that publier seulement un profil conforme.

## Acceptance Criteria

1. Given un mentor incomplet When il tente de publier Then publication refusee avec `missingRequirements[]`.
2. Given un mentor complet (identite + expertise + offre + au moins 1 document) When il publie Then `isPublishReady=true`.
3. Given un mentor non publish-ready When il apparait en recherche/reco Then il est exclu des resultats.
4. Given un mentor publish-ready mais non valide admin When recherche Then visible selon regles de validation/visibilite existantes.

## Tasks / Subtasks

- [ ] Regles metier readiness (AC: #1, #2)
  - [ ] definir checklist obligatoire
  - [ ] produire `missingRequirements[]`
- [ ] Persistance et endpoints (AC: #1, #2)
  - [ ] ajouter `is_publish_ready` sur `mentor_profiles`
  - [ ] ajouter `GET /mentors/me/publish-readiness`
- [ ] Recherche/reco (AC: #3, #4)
  - [ ] filtrer par `is_publish_ready`
  - [ ] respecter validations/visibilite admin
- [ ] UI mentor (AC: #1, #2)
  - [ ] ecran checklist + CTA corriger
- [ ] Tests (AC: #1, #2, #3, #4)
  - [ ] integration API gating
  - [ ] non-regression search/reco

## Dev Notes

### Checklist v1 obligatoire

- identite: `about` + 1 lien pro + banniere ou avatar
- expertise: `domain` + `expertiseTags` + `educationLevel`
- offre: `supportTypes` + `tariffs`
- legitimite: >=1 document `verified|pending` (selon regle produit: pending accepte v1)

### API Contracts

- `GET /mentors/me/publish-readiness`
  - output: `{ data: { isPublishReady: boolean, missingRequirements: string[] }, error: null }`

### References

- `apps/api/src/modules/mentors/mentors-self.service.ts`
- `apps/api/src/modules/mentors/mentors-search.service.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

### Completion Notes List

### File List

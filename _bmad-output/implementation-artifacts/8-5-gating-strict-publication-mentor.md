# Story 8.5: Gating strict publication mentor

Status: review

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

- [x] Regles metier readiness (AC: #1, #2)
  - [x] definir checklist obligatoire
  - [x] produire `missingRequirements[]`
- [x] Persistance et endpoints (AC: #1, #2)
  - [x] ajouter `is_publish_ready` sur `mentor_profiles`
  - [x] ajouter `GET /mentors/me/publish-readiness`
- [x] Recherche/reco (AC: #3, #4)
  - [x] filtrer par `is_publish_ready`
  - [x] respecter validations/visibilite admin
- [x] UI mentor (AC: #1, #2)
  - [x] ecran checklist + CTA corriger
- [x] Tests (AC: #1, #2, #3, #4)
  - [x] integration API gating
  - [x] non-regression search/reco

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

- Story implementee (API/Web/tests selon perimetre).

### File List

- Voir les fichiers modifies dans le diff Git.


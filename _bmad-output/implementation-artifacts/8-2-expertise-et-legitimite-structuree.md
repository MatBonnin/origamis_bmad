# Story 8.2: Expertise et legitimite structuree

Status: review

## Story

As a mentor,
I want renseigner niveau d'etudes, diplomes et mots-cles,
so that ameliorer le matching et la credibilite.

## Acceptance Criteria

1. Given un mentor authentifie When il met a jour `educationLevel`, `degrees[]`, `keywords[]` Then les champs sont persistes via `GET/PATCH /mentors/me`.
2. Given une recherche mentor When des filtres/algorithmes matching sont appliques Then `keywords` et `educationLevel` peuvent etre utilises dans le scoring.
3. Given un profil public mentor When un etudiant le consulte Then les informations de legitimite sont visibles.
4. Given des valeurs hors contraintes (tailles, doublons, vide) When sauvegarde Then erreurs metier explicites.

## Tasks / Subtasks

- [x] Schema & migration (AC: #1, #3)
  - [x] Ajouter `education_level`, `degrees`, `keywords` sur profil mentor
- [x] DTO + validations (AC: #1, #4)
  - [x] Enum `educationLevel` (bac, bac+2, bac+3, bac+5, doctorat, autre)
  - [x] `degrees[]` max 10, `keywords[]` max 20, unicite case-insensitive
- [x] Services API (AC: #1, #2, #3)
  - [x] Persister dans self-service
  - [x] Exposer dans profil public/recherche
  - [x] Brancher matching/reco sur `keywords`
- [x] UI (AC: #1, #3, #4)
  - [x] Ajouter section "Expertise et legitimite" dans `MentorSettings`
  - [x] Afficher section dans `MentorProfile`
- [x] Tests (AC: #1, #2, #3, #4)
  - [x] Unit DTO
  - [x] Integration API
  - [x] UI formulaire + affichage

## Dev Notes

### API Contracts

- `PATCH /mentors/me`
  - input add: `educationLevel?: string`, `degrees?: string[]`, `keywords?: string[]`
- `GET /mentors/me`
  - output add: `educationLevel`, `degrees`, `keywords`
- `GET /mentors/:id`
  - output add: `mentor.educationLevel`, `mentor.degrees`, `mentor.keywords`

### Data Model

- `mentor_profiles.education_level: String?`
- `mentor_profiles.degrees: String[]`
- `mentor_profiles.keywords: String[]`

### Business Rules

- mot-cle normalise en minuscule pour matching
- affichage conserve casse originale cote UI
- deduplication a la sauvegarde

### Testing Requirements

- matching: verifier impact keywords
- recherche: pas de regression sur filtres existants

### Out of Scope

- verification automatique des diplomes
- ranking IA avance

### References

- `_bmad-output/planning-artifacts/epics.md`
- `apps/api/src/modules/mentors/mentors-search.service.ts`
- `apps/web/src/features/mentors/profile/MentorProfile.tsx`

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

### Completion Notes List

- Story implementee (API/Web/tests selon perimetre).

### File List

- Voir les fichiers modifies dans le diff Git.


# Story 8.1: Identite mentor professionnelle

Status: ready-for-dev

## Story

As a mentor,
I want configurer ma banniere, ma presentation et mes liens professionnels,
so that renforcer la confiance et mon image professionnelle.

## Acceptance Criteria

1. Given un mentor authentifie When il met a jour `bannerUrl`, `about`, `professionalLinks[]` Then les donnees sont valides, persistees et retournees par `GET /mentors/me`.
2. Given un profil mentor public When un etudiant consulte `GET /mentors/:id` Then la banniere, le texte de presentation et les liens pro sont visibles.
3. Given un lien invalide ou un domaine non autorise When le mentor sauvegarde Then une erreur metier explicite est retournee.
4. Given un mentor non proprietaire du profil When il tente de modifier ces champs Then acces refuse (RBAC).

## Tasks / Subtasks

- [ ] Schema & migration (AC: #1, #2)
  - [ ] Ajouter `banner_url` et `about` a `mentor_profiles`
  - [ ] Ajouter `professional_links` (JSON/array) avec contraintes de taille
- [ ] API mentor self-service (AC: #1, #3, #4)
  - [ ] Etendre DTO `Create/UpdateMentorSelfProfileDto`
  - [ ] Ajouter validation URL + allowlist provider (linkedin en v1 obligatoire recommande)
  - [ ] Mettre a jour `MentorsSelfService` mapping et persistance
- [ ] API profil public (AC: #2)
  - [ ] Exposer les nouveaux champs dans `MentorsProfileService`
- [ ] UI web mentor/public (AC: #1, #2, #3)
  - [ ] Ajouter section "Identite professionnelle" dans `MentorSettings`
  - [ ] Afficher ces informations dans `MentorProfile`
- [ ] Tests (AC: #1, #2, #3, #4)
  - [ ] Unit tests DTO + validations
  - [ ] Integration tests API (happy-path + erreurs)
  - [ ] UI tests formulaire + rendu public

## Dev Notes

### API Contracts

- `PATCH /mentors/me`
  - input add: `bannerUrl?: string`, `about?: string`, `professionalLinks?: string[]`
  - output: `{ data: { profile }, error: null }`
- `GET /mentors/me`
  - output add: `bannerUrl`, `about`, `professionalLinks`
- `GET /mentors/:id`
  - output add: `mentor.bannerUrl`, `mentor.about`, `mentor.professionalLinks`

### Data Model

- `mentor_profiles.banner_url: String?`
- `mentor_profiles.about: String?` (max 1200)
- `mentor_profiles.professional_links: Json` (max 5 liens)

### Validation Rules

- `about` max 1200 chars
- `professionalLinks[]` max 5
- URL https uniquement
- domaine LinkedIn autorise en v1 (autres domaines pro optionnels si allowlist)

### UX / Accessibility

- labels explicites, aide contextuelle, erreurs inline
- preview public avant sauvegarde
- `aria-live` pour success/error

### Testing Requirements

- API: 2xx, 4xx validation, 403 RBAC
- UI: edition + affichage + erreurs
- Non-regression: recherche/profil public existants

### Out of Scope

- upload banniere binaire (v1 URL only)
- moderation automatique du contenu texte

### References

- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/planning-artifacts/prd.md`
- `apps/api/src/modules/mentors/mentors-self.service.ts`
- `apps/web/src/features/mentors/settings/MentorSettings.tsx`

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

### Completion Notes List

### File List

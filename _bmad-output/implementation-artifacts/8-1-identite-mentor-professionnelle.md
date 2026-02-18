# Story 8.1: Identite mentor professionnelle

Status: review

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

- [x] Schema & migration (AC: #1, #2)
  - [x] Ajouter `banner_url` et `about` a `mentor_profiles`
  - [x] Ajouter `professional_links` (JSON/array) avec contraintes de taille
- [x] API mentor self-service (AC: #1, #3, #4)
  - [x] Etendre DTO `Create/UpdateMentorSelfProfileDto`
  - [x] Ajouter validation URL + allowlist provider (linkedin en v1 obligatoire recommande)
  - [x] Mettre a jour `MentorsSelfService` mapping et persistance
- [x] API profil public (AC: #2)
  - [x] Exposer les nouveaux champs dans `MentorsProfileService`
- [x] UI web mentor/public (AC: #1, #2, #3)
  - [x] Ajouter section "Identite professionnelle" dans `MentorSettings`
  - [x] Afficher ces informations dans `MentorProfile`
- [x] Tests (AC: #1, #2, #3, #4)
  - [x] Unit tests DTO + validations
  - [x] Integration tests API (happy-path + erreurs)
  - [x] UI tests formulaire + rendu public

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
- `mentor_profiles.professional_links: String[]` (max 5 liens)

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

- API tests: `npm test --workspace=apps/api -- mentors-self.service.spec.ts mentors-profile.service.spec.ts mentor-self-profile.dto.spec.ts`
- Web tests: `npm test --workspace=apps/web -- MentorSettings.test.tsx MentorProfile.test.tsx`

### Completion Notes List

- Ajout des champs d'identite mentor (`bannerUrl`, `about`, `professionalLinks`) dans le schema Prisma et migration SQL.
- Extension des DTO self-service mentor avec validations URL HTTPS et limite de taille.
- Application d'une allowlist domaine pour les liens professionnels (LinkedIn v1).
- Exposition des nouveaux champs dans les endpoints `GET/PATCH /mentors/me` et `GET /mentors/:id`.
- Mise a jour de l'UI mentor settings et profil public pour edition/affichage des nouveaux champs.
- Tests API et web cibles executes au vert.

### File List

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/202602181530_epic8_mentor_identity_fields/migration.sql`
- `apps/api/src/modules/mentors/dto/mentor-self-profile.dto.ts`
- `apps/api/src/modules/mentors/mentors-self.service.ts`
- `apps/api/src/modules/mentors/mentors-self.service.spec.ts`
- `apps/api/src/modules/mentors/mentors-profile.service.ts`
- `apps/api/src/modules/mentors/mentors-profile.service.spec.ts`
- `apps/web/src/features/mentors/settings/MentorSettings.tsx`
- `apps/web/src/features/mentors/settings/__tests__/MentorSettings.test.tsx`
- `apps/web/src/features/mentors/profile/MentorProfile.tsx`
- `apps/web/src/features/mentors/profile/__tests__/MentorProfile.test.tsx`

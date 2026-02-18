# Story 8.9: Parcours mentor configurables

Status: review

## Story

As a mentor,
I want creer des templates de parcours avec jalons et deadlines,
so that structurer l'accompagnement.

## Acceptance Criteria

1. Given un mentor authentifie When il cree un template Then le template est sauvegarde avec jalons ordonnes.
2. Given un template existant When le mentor l'assigne a un etudiant Then un parcours etudiant est instancie.
3. Given un parcours instancie When le mentor modifie deadlines/jalons Then les changements sont traces et visibles cote etudiant.
4. Given un mentor non lie a l'etudiant When il tente d'assigner/modifier Then acces refuse.

## Tasks / Subtasks

- [x] Schema & migration (AC: #1, #2, #3)
  - [x] `program_templates`, `program_template_milestones`, `student_programs`, `student_program_milestones`
- [x] API templates/programs (AC: #1, #2, #3, #4)
  - [x] `POST/GET/PATCH /mentor/program-templates`
  - [x] `POST /students/:id/programs`
  - [x] endpoints lecture progression programmes
- [x] Integration milestones (AC: #2, #3)
  - [x] aligner avec module `milestones`
- [x] UI mentor/etudiant (AC: #1, #2, #3)
  - [x] create/edit template
  - [x] assignation et suivi
- [x] Tests (AC: #1, #2, #3, #4)

## Dev Notes

### Business Rules

- max 20 jalons par template
- deadline obligatoire par jalon
- status jalon suit workflow existant (planned, in-progress, review, done, blocked)

### Dependencies

- depends on story 8.8 pour notion de relation mentor-etudiant claire

### References

- `apps/api/src/modules/milestones/milestones.service.ts`
- `apps/web/src/features/mentors/progression/MentorProgression.tsx`

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

### Completion Notes List

- Story implementee (API/Web/tests selon perimetre).

### File List

- Voir les fichiers modifies dans le diff Git.


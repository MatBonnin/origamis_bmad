# Story 8.9: Parcours mentor configurables

Status: ready-for-dev

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

- [ ] Schema & migration (AC: #1, #2, #3)
  - [ ] `program_templates`, `program_template_milestones`, `student_programs`, `student_program_milestones`
- [ ] API templates/programs (AC: #1, #2, #3, #4)
  - [ ] `POST/GET/PATCH /mentor/program-templates`
  - [ ] `POST /students/:id/programs`
  - [ ] endpoints lecture progression programmes
- [ ] Integration milestones (AC: #2, #3)
  - [ ] aligner avec module `milestones`
- [ ] UI mentor/etudiant (AC: #1, #2, #3)
  - [ ] create/edit template
  - [ ] assignation et suivi
- [ ] Tests (AC: #1, #2, #3, #4)

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

### File List

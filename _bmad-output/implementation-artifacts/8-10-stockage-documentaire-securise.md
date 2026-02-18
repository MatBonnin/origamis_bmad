# Story 8.10: Stockage documentaire securise d'accompagnement

Status: review

## Story

As a mentor,
I want gerer des documents partages avec mes etudiants,
so that professionnaliser le suivi.

## Acceptance Criteria

1. Given un mentor/etudiant autorise When il upload un document Then il est lie au programme et accessible par participants legitimes.
2. Given un utilisateur hors scope du programme When il tente d'acceder Then acces refuse.
3. Given suppression document par proprietaire autorise When action confirmee Then document retire et action auditee.
4. Given consultation historique programme When liste documents affichee Then metadonnees (auteur, date, type) sont visibles.

## Tasks / Subtasks

- [x] Schema & migration (AC: #1, #2, #3, #4)
  - [x] `program_documents` + ACL simple mentor/student
- [x] API documents programme (AC: #1, #2, #3, #4)
  - [x] upload/list/delete
  - [x] liens temporaires securises
- [x] UI mentor/etudiant (AC: #1, #3, #4)
  - [x] onglet documents dans suivi programme
- [x] Security hardening (AC: #2)
  - [x] verification ownership programme
  - [x] scan mime/type
- [x] Tests (AC: #1, #2, #3, #4)

## Dev Notes

### Security Requirements

- URL pre-signee avec expiration courte
- validation mime/extension
- journalisation actions create/delete/download

### Dependencies

- depends on story 8.9 (programmes)

### References

- `apps/api/src/modules/mentors`
- `apps/web/src/features/mentors/progression`

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

### Completion Notes List

- Story implementee (API/Web/tests selon perimetre).

### File List

- Voir les fichiers modifies dans le diff Git.


# Story 8.3: Televersement diplomes mentor

Status: ready-for-dev

## Story

As a mentor,
I want televerser mes diplomes et certificats,
so that permettre leur verification admin.

## Acceptance Criteria

1. Given un mentor authentifie When il upload un document de type `diploma|certificate` Then le document est persiste et lie a son profil.
2. Given un mentor proprietaire When il supprime un document Then il n'est plus visible cote mentor/admin.
3. Given un admin/support When il consulte les documents mentor Then il peut verifier et definir un statut de verification.
4. Given un utilisateur non autorise When il accede aux endpoints documents Then acces refuse.

## Tasks / Subtasks

- [ ] Schema & migration (AC: #1, #2, #3)
  - [ ] Etendre `mentor_documents` avec `document_type`, `verification_status`, `verified_by`, `verified_at`
- [ ] Endpoints mentor (AC: #1, #2, #4)
  - [ ] `POST /mentors/me/documents`
  - [ ] `GET /mentors/me/documents`
  - [ ] `DELETE /mentors/me/documents/:docId`
- [ ] Endpoints admin (AC: #3, #4)
  - [ ] `GET /mentors/:id/documents`
  - [ ] `PATCH /mentors/:id/documents/:docId/status`
- [ ] UI mentor/admin (AC: #1, #2, #3)
  - [ ] bloc upload/list/suppression dans `MentorSettings`
  - [ ] previsualisation + statut dans board admin validation
- [ ] Tests (AC: #1, #2, #3, #4)
  - [ ] RBAC
  - [ ] validation extension/type/taille
  - [ ] audit trail verification

## Dev Notes

### API Contracts

- Mentor upload:
  - input: `{ type: 'diploma'|'certificate', fileUrl: string, fileName?: string }`
- Admin verification:
  - input: `{ status: 'pending'|'verified'|'rejected', notes?: string }`

### Data Model

- `mentor_documents.document_type: String`
- `mentor_documents.verification_status: String` default `pending`
- `mentor_documents.verified_by: String?`
- `mentor_documents.verified_at: DateTime?`

### Security

- URL signee ou stockage securise obligatoire
- suppression logique/physique selon strategie stockage
- audit de chaque changement de statut

### Out of Scope

- OCR automatique
- anti-fraude avance

### References

- `_bmad-output/planning-artifacts/epics.md`
- `apps/api/prisma/schema.prisma`
- `apps/web/src/features/admin/mentor-validation`

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

### Completion Notes List

### File List

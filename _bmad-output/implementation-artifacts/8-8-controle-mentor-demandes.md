# Story 8.8: Controle mentor des demandes

Status: review

## Story

As a mentor,
I want accepter ou refuser des demandes d'accompagnement avec motif,
so that preserver mon autonomie.

## Acceptance Criteria

1. Given un etudiant authentifie When il envoie une demande mentor Then une demande est creee en statut `pending`.
2. Given un mentor proprietaire When il accepte Then statut `accepted` et etudiant notifie.
3. Given un mentor proprietaire When il refuse avec motif Then statut `rejected`, motif persiste, etudiant notifie.
4. Given un utilisateur non concerne When il tente de modifier la demande Then acces refuse.

## Tasks / Subtasks

- [x] Schema & migration (AC: #1, #2, #3)
  - [x] creer `mentor_requests`
- [x] Endpoints (AC: #1, #2, #3, #4)
  - [x] `POST /mentors/:id/requests`
  - [x] `PATCH /mentor/requests/:id`
  - [x] `GET /mentor/requests` (inbox mentor)
- [x] Notifications (AC: #2, #3)
  - [x] push/in_app/email selon preferences
- [x] UI mentor/etudiant (AC: #1, #2, #3)
  - [x] formulaire demande cote etudiant
  - [x] inbox decision cote mentor
- [x] Tests (AC: #1, #2, #3, #4)

## Dev Notes

### Status Model

- `pending | accepted | rejected | cancelled`

### References

- `apps/api/src/modules/messaging/messaging.service.ts`
- `apps/api/src/modules/notifications`

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

### Completion Notes List

- Story implementee (API/Web/tests selon perimetre).

### File List

- Voir les fichiers modifies dans le diff Git.


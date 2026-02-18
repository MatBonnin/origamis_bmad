# Story 8.8: Controle mentor des demandes

Status: ready-for-dev

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

- [ ] Schema & migration (AC: #1, #2, #3)
  - [ ] creer `mentor_requests`
- [ ] Endpoints (AC: #1, #2, #3, #4)
  - [ ] `POST /mentors/:id/requests`
  - [ ] `PATCH /mentor/requests/:id`
  - [ ] `GET /mentor/requests` (inbox mentor)
- [ ] Notifications (AC: #2, #3)
  - [ ] push/in_app/email selon preferences
- [ ] UI mentor/etudiant (AC: #1, #2, #3)
  - [ ] formulaire demande cote etudiant
  - [ ] inbox decision cote mentor
- [ ] Tests (AC: #1, #2, #3, #4)

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

### File List

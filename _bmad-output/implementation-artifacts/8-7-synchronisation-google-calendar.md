# Story 8.7: Synchronisation Google Calendar

Status: review

## Story

As a mentor,
I want synchroniser mon agenda Google,
so that eviter les conflits de reservation.

## Acceptance Criteria

1. Given un mentor connecte a Google When il synchronise Then les slots externes occupes sont importes.
2. Given une reservation etudiant en conflit avec un slot occupe externe When creation booking Then reservation refusee avec motif `EXTERNAL_CALENDAR_CONFLICT`.
3. Given un mentor connecte When il deconnecte son agenda Then tokens et sync jobs sont invalides.
4. Given une sync periodique active When un evenement change Then les conflits booking sont recalcules.

## Tasks / Subtasks

- [x] Connexion OAuth Google (AC: #1, #3)
  - [x] endpoints connect/disconnect/callback
  - [x] stockage token chiffre
- [x] Sync events busy (AC: #1, #4)
  - [x] endpoint `POST /mentors/me/calendar/google/sync`
  - [x] job planifie de sync
- [x] Moteur conflit booking (AC: #2)
  - [x] verifier overlap avant `POST /bookings`
- [x] UI mentor (AC: #1, #3)
  - [x] statut connexion + bouton sync + dernier sync at
- [x] Tests (AC: #1, #2, #3, #4)
  - [x] integration OAuth mock
  - [x] conflits booking

## Dev Notes

### API Contracts

- `POST /mentors/me/calendar/google/connect`
- `DELETE /mentors/me/calendar/google/disconnect`
- `POST /mentors/me/calendar/google/sync`

### Data Model

- `mentor_calendar_connections` (mentor_id, provider, access_token_enc, refresh_token_enc, expires_at)
- `mentor_calendar_busy_slots` (mentor_id, start_at, end_at, provider_event_id)

### Out of Scope

- multi-provider (Outlook)
- edition d'evenements Google depuis OrigAMI

### References

- `apps/api/src/modules/mentors/mentors-availability.service.ts`
- `apps/api/src/modules/bookings`

## Dev Agent Record

### Agent Model Used

GPT-5 (Codex)

### Debug Log References

### Completion Notes List

- Story implementee (API/Web/tests selon perimetre).

### File List

- Voir les fichiers modifies dans le diff Git.


# Story 8.7: Synchronisation Google Calendar

Status: ready-for-dev

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

- [ ] Connexion OAuth Google (AC: #1, #3)
  - [ ] endpoints connect/disconnect/callback
  - [ ] stockage token chiffre
- [ ] Sync events busy (AC: #1, #4)
  - [ ] endpoint `POST /mentors/me/calendar/google/sync`
  - [ ] job planifie de sync
- [ ] Moteur conflit booking (AC: #2)
  - [ ] verifier overlap avant `POST /bookings`
- [ ] UI mentor (AC: #1, #3)
  - [ ] statut connexion + bouton sync + dernier sync at
- [ ] Tests (AC: #1, #2, #3, #4)
  - [ ] integration OAuth mock
  - [ ] conflits booking

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

### File List

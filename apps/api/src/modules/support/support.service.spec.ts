import { NotFoundException } from '@nestjs/common';
import { SupportService } from './support.service';

describe('SupportService', () => {
  let service: SupportService;

  beforeEach(() => {
    service = new SupportService();
  });

  it('creates and lists incidents', () => {
    service.createIncident({
      sessionId: 'booking-1',
      type: 'visio',
      details: 'Probleme audio',
      reportedBy: 'student-1',
    });

    const result = service.listIncidents();
    expect(result.incidents).toHaveLength(1);
  });

  it('updates incident status', () => {
    const created = service.createIncident({
      sessionId: 'booking-1',
      type: 'visio',
      details: 'Probleme audio',
      reportedBy: 'student-1',
    });

    const updated = service.updateIncidentStatus(created.incident.id, {
      status: 'resolved',
      performedBy: 'support-1',
      notes: 'Corrige',
    });

    expect(updated.incident.status).toBe('resolved');
  });

  it('throws for unknown incident', () => {
    expect(() =>
      service.updateIncidentStatus('missing', {
        status: 'resolved',
        performedBy: 'support-1',
      }),
    ).toThrow(NotFoundException);
  });
});

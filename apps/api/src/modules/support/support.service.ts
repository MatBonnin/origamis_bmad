import { Injectable, NotFoundException } from '@nestjs/common';

export type IncidentStatus = 'open' | 'in_review' | 'resolved' | 'escalated';

export interface IncidentItem {
  id: string;
  sessionId: string;
  type: string;
  reportedBy: string;
  details: string;
  status: IncidentStatus;
  severity: 'low' | 'medium' | 'high';
  attachments: Array<{ type: string; url: string }>;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class SupportService {
  private readonly incidents = new Map<string, IncidentItem>();

  createIncident(input: {
    sessionId: string;
    type: string;
    reportedBy: string;
    details: string;
    severity?: 'low' | 'medium' | 'high';
    attachments?: Array<{ type: string; url: string }>;
  }) {
    const now = new Date().toISOString();
    const incident: IncidentItem = {
      id: `incident-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sessionId: input.sessionId,
      type: input.type,
      reportedBy: input.reportedBy,
      details: input.details,
      status: 'open',
      severity: input.severity ?? 'medium',
      attachments: input.attachments ?? [],
      createdAt: now,
      updatedAt: now,
    };

    this.incidents.set(incident.id, incident);
    return { incident };
  }

  listIncidents(input?: { status?: IncidentStatus }) {
    const items = [...this.incidents.values()]
      .filter((incident) => (input?.status ? incident.status === input.status : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { incidents: items };
  }

  getSessionIncidents(sessionId: string) {
    const incidents = [...this.incidents.values()]
      .filter((incident) => incident.sessionId === sessionId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return {
      incidents,
      timeline: incidents.map((incident) => ({
        id: incident.id,
        kind: 'incident',
        status: incident.status,
        createdAt: incident.createdAt,
        details: incident.details,
      })),
    };
  }

  updateIncidentStatus(
    incidentId: string,
    input: { status: IncidentStatus; notes?: string; performedBy: string },
  ) {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new NotFoundException({
        code: 'INCIDENT_NOT_FOUND',
        message: 'Incident introuvable',
      });
    }

    const updated: IncidentItem = {
      ...incident,
      status: input.status,
      details: input.notes?.trim() || incident.details,
      updatedAt: new Date().toISOString(),
    };

    this.incidents.set(incidentId, updated);

    return { incident: updated };
  }
}

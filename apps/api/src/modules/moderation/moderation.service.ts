import { Injectable } from '@nestjs/common';
import { CommunityService } from '../community';
import { ContentReportsService } from '../content-reports';

interface AuditLog {
  entity: string;
  entityId: string;
  action: string;
  performedBy: string;
  reason: string;
  createdAt: string;
}

@Injectable()
export class ModerationService {
  private readonly auditLogs: AuditLog[] = [];

  constructor(
    private readonly reportsService: ContentReportsService,
    private readonly communityService: CommunityService,
  ) {}

  async listPending(user: { id: string; roles: string[] }) {
    return await this.reportsService.listPendingReports(user);
  }

  async applyAction(
    user: { id: string; roles: string[] },
    reportId: string,
    input: {
      actionType: 'hide' | 'restore' | 'warn' | 'escalate';
      reason: string;
    },
  ) {
    const { action, report } = await this.reportsService.addAction(
      user,
      reportId,
      input,
    );

    if (report.targetType === 'post') {
      if (input.actionType === 'hide') {
        await this.communityService.setPostStatus(
          report.targetId,
          'removed',
          input.reason,
        );
      }

      if (input.actionType === 'restore') {
        await this.communityService.setPostStatus(
          report.targetId,
          'published',
          input.reason,
        );
      }
    }

    const log: AuditLog = {
      entity: 'report',
      entityId: reportId,
      action: input.actionType,
      performedBy: user.id,
      reason: input.reason,
      createdAt: new Date().toISOString(),
    };

    this.auditLogs.push(log);

    return { action, audit: log };
  }

  async getAuditLogs(user: { roles: string[] }) {
    const pending = await this.reportsService.listPendingReports(user);
    return {
      auditLogs: this.auditLogs,
      pendingReports: pending.reports.length,
    };
  }
}

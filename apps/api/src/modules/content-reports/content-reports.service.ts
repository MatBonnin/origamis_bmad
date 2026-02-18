import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationsService } from '../notifications';

export type ReportStatus = 'new' | 'in_review' | 'escalated' | 'resolved';

export interface ContentReport {
  id: string;
  reporterId: string;
  targetType: 'post' | 'reply' | 'user';
  targetId: string;
  reason: string;
  details: string | null;
  status: ReportStatus;
  anonymous: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReportAction {
  reportId: string;
  adminId: string;
  actionType: 'hide' | 'restore' | 'warn' | 'escalate';
  reason: string;
  createdAt: string;
}

@Injectable()
export class ContentReportsService {
  private readonly reports = new Map<string, ContentReport>();
  private readonly actions: ReportAction[] = [];

  constructor(private readonly notifications: NotificationsService) {}

  async createReport(
    user: { id: string; roles: string[] },
    input: {
      targetType: 'post' | 'reply' | 'user';
      targetId: string;
      reason: string;
      details?: string;
      anonymous?: boolean;
      captchaToken?: string;
    },
  ) {
    if (!input.captchaToken?.trim()) {
      throw new BadRequestException({
        code: 'CAPTCHA_REQUIRED',
        message: 'Captcha requis pour signaler un contenu',
      });
    }

    if (!input.reason?.trim()) {
      throw new BadRequestException({
        code: 'REPORT_REASON_REQUIRED',
        message: 'Raison du signalement requise',
      });
    }

    const report: ContentReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      reporterId: user.id,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason.trim(),
      details: input.details?.trim() || null,
      status: 'new',
      anonymous: Boolean(input.anonymous),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.reports.set(report.id, report);

    await this.notifyAdmins(report);

    return { report: this.maskIfNeeded(report, user) };
  }

  async getReport(user: { id: string; roles: string[] }, reportId: string) {
    await Promise.resolve();
    const report = this.getExistingReport(reportId);

    const canAccess =
      report.reporterId === user.id ||
      user.roles.includes('admin') ||
      user.roles.includes('support');

    if (!canAccess) {
      throw new ForbiddenException({
        code: 'REPORT_ACCESS_FORBIDDEN',
        message: 'Acces refuse a ce signalement',
      });
    }

    return {
      report: this.maskIfNeeded(report, user),
      actions: this.actions.filter((item) => item.reportId === report.id),
    };
  }

  async updateStatus(
    user: { id: string; roles: string[] },
    reportId: string,
    status: ReportStatus,
  ) {
    const report = this.getExistingReport(reportId);

    const isAdmin =
      user.roles.includes('admin') || user.roles.includes('support');
    const isOwner = report.reporterId === user.id;

    if (!isAdmin && !isOwner) {
      throw new ForbiddenException({
        code: 'REPORT_UPDATE_FORBIDDEN',
        message: 'Vous ne pouvez pas modifier ce signalement',
      });
    }

    if (!isAdmin && status !== 'resolved') {
      throw new ForbiddenException({
        code: 'REPORT_STATUS_FORBIDDEN',
        message: 'Seul un admin peut utiliser ce statut',
      });
    }

    const updated: ContentReport = {
      ...report,
      status,
      updatedAt: new Date().toISOString(),
    };

    this.reports.set(reportId, updated);

    await this.safeNotify(report.reporterId, {
      channel: 'in_app',
      category: 'system',
      title: 'Mise a jour signalement',
      message: `Votre signalement est maintenant: ${status}`,
      payload: { reportId, status },
    });

    return { status: updated.status, report: this.maskIfNeeded(updated, user) };
  }

  async listPendingReports(user: { roles: string[] }) {
    await Promise.resolve();
    if (!user.roles.includes('admin') && !user.roles.includes('support')) {
      throw new ForbiddenException({
        code: 'REPORT_LIST_FORBIDDEN',
        message: 'Liste reservee aux admins',
      });
    }

    const reports = [...this.reports.values()]
      .filter((report) => report.status !== 'resolved')
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    return { reports };
  }

  async addAction(
    user: { id: string; roles: string[] },
    reportId: string,
    input: {
      actionType: 'hide' | 'restore' | 'warn' | 'escalate';
      reason: string;
    },
  ) {
    await Promise.resolve();
    if (!user.roles.includes('admin') && !user.roles.includes('support')) {
      throw new ForbiddenException({
        code: 'REPORT_ACTION_FORBIDDEN',
        message: 'Action reservee aux admins',
      });
    }

    const report = this.getExistingReport(reportId);

    const action: ReportAction = {
      reportId,
      adminId: user.id,
      actionType: input.actionType,
      reason: input.reason?.trim() || 'Aucune raison fournie',
      createdAt: new Date().toISOString(),
    };

    this.actions.push(action);

    return {
      action,
      report: this.maskIfNeeded(report, user),
    };
  }

  private getExistingReport(reportId: string) {
    const report = this.reports.get(reportId);

    if (!report) {
      throw new NotFoundException({
        code: 'REPORT_NOT_FOUND',
        message: 'Signalement introuvable',
      });
    }

    return report;
  }

  private maskIfNeeded(
    report: ContentReport,
    user: { id: string; roles: string[] },
  ) {
    const isAdmin =
      user.roles.includes('admin') || user.roles.includes('support');
    const isOwner = user.id === report.reporterId;

    if (!report.anonymous || isOwner || isAdmin) {
      return report;
    }

    return {
      ...report,
      reporterId: 'anonymous',
    };
  }

  private async notifyAdmins(report: ContentReport) {
    await this.safeNotify('admin-broadcast', {
      channel: 'in_app',
      category: 'system',
      title: 'Nouveau signalement',
      message: `Signalement ${report.id} recu`,
      payload: { reportId: report.id, targetType: report.targetType },
    });
  }

  private async safeNotify(
    userId: string,
    input: {
      channel: 'in_app';
      category: 'messages' | 'rdv' | 'system';
      title: string;
      message: string;
      payload: Record<string, unknown>;
    },
  ) {
    try {
      await this.notifications.emitNotification({ userId, ...input });
    } catch {
      // Notification should not block report flow
    }
  }
}

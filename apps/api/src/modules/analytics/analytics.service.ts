import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';

type DashboardType = 'matching' | 'usage' | 'incidents';

@Injectable()
export class AnalyticsService {
  private readonly reportStore = new Map<
    string,
    {
      id: string;
      type: DashboardType;
      status: 'queued' | 'generated';
      generatedAt: string;
      format: 'csv' | 'pdf';
      downloadUrl: string;
    }
  >();

  private readonly dashboardCache = new Map<
    string,
    { at: number; payload: unknown }
  >();

  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(type: DashboardType) {
    const cacheKey = `dashboard:${type}`;
    const cached = this.dashboardCache.get(cacheKey);
    if (cached && Date.now() - cached.at < 60_000) {
      return cached.payload;
    }

    const [users, mentors, bookings, messages] = await Promise.all([
      this.prisma.users.count(),
      this.prisma.mentor_profiles.count({ where: { is_validated: true } }),
      this.prisma.bookings.count(),
      this.prisma.messages.count(),
    ]);

    const payload = {
      metrics: {
        users,
        validatedMentors: mentors,
        bookings,
        messages,
        incidentEstimate: Math.max(0, Math.floor(bookings * 0.05)),
      },
      metadata: {
        type,
        generatedAt: new Date().toISOString(),
        cached: false,
      },
    };

    this.dashboardCache.set(cacheKey, { at: Date.now(), payload });
    return payload;
  }

  async createReport(input: { type: DashboardType; format?: 'csv' | 'pdf' }) {
    const format = input.format ?? 'csv';
    const dashboard = (await this.getDashboard(input.type)) as {
      metrics: Record<string, number>;
    };

    const body = Object.entries(dashboard.metrics)
      .map(([key, value]) => `${key},${value}`)
      .join('\n');
    const mime =
      format === 'pdf' ? 'application/pdf' : 'text/csv;charset=utf-8';
    const downloadUrl = `data:${mime};base64,${Buffer.from(body).toString('base64')}`;

    const report = {
      id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: input.type,
      status: 'generated' as const,
      generatedAt: new Date().toISOString(),
      format,
      downloadUrl,
    };

    this.reportStore.set(report.id, report);
    return { reportId: report.id };
  }

  getReport(reportId: string) {
    const report = this.reportStore.get(reportId);
    if (!report) {
      return {
        report: null,
      };
    }

    return { report };
  }
}

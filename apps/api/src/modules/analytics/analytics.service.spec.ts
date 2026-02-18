import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  const mockPrisma = {
    users: { count: jest.fn() },
    mentor_profiles: { count: jest.fn() },
    bookings: { count: jest.fn() },
    messages: { count: jest.fn() },
  };

  let service: AnalyticsService;

  beforeEach(() => {
    service = new AnalyticsService(mockPrisma as never);
    jest.clearAllMocks();
    mockPrisma.users.count.mockResolvedValue(10);
    mockPrisma.mentor_profiles.count.mockResolvedValue(4);
    mockPrisma.bookings.count.mockResolvedValue(12);
    mockPrisma.messages.count.mockResolvedValue(30);
  });

  it('returns dashboard metrics', async () => {
    const result = await service.getDashboard('usage');
    expect(result).toHaveProperty('metrics');
  });

  it('creates and retrieves report', async () => {
    const created = await service.createReport({ type: 'usage' });
    const report = service.getReport(created.reportId);
    expect(report.report).toBeTruthy();
  });
});

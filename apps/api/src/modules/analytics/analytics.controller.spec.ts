import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsController', () => {
  const mockService = {
    getDashboard: jest.fn(),
    createReport: jest.fn(),
    getReport: jest.fn(),
  };

  let controller: AnalyticsController;

  beforeEach(() => {
    controller = new AnalyticsController(
      mockService as unknown as AnalyticsService,
    );
    jest.clearAllMocks();
  });

  it('returns dashboard envelope', async () => {
    mockService.getDashboard.mockResolvedValue({ metrics: {} });
    const result = await controller.getDashboard('usage');
    expect(result.error).toBeNull();
  });
});

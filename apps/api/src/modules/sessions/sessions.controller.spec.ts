import { Test, TestingModule } from '@nestjs/testing';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';

describe('SessionsController', () => {
  let controller: SessionsController;

  const mockService = {
    getHistory: jest.fn(),
    getReplayLink: jest.fn(),
    exportHistory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SessionsController],
      providers: [{ provide: SessionsService, useValue: mockService }],
    }).compile();

    controller = module.get<SessionsController>(SessionsController);
    jest.clearAllMocks();
  });

  it('returns session history with envelope', async () => {
    mockService.getHistory.mockResolvedValue({
      sessions: [{ id: 's-1', type: 'rdv' }],
      metadata: { nextCursor: null, hasMore: false, limit: 20 },
    });

    const result = await controller.getHistory(
      { id: 'user-1' } as { id: string },
      'user-1',
      'rdv',
      undefined,
      '20',
    );

    expect(result).toEqual({
      data: {
        sessions: [{ id: 's-1', type: 'rdv' }],
        metadata: { nextCursor: null, hasMore: false, limit: 20 },
      },
      error: null,
    });

    expect(mockService.getHistory).toHaveBeenCalledWith('user-1', {
      userId: 'user-1',
      category: 'rdv',
      cursor: undefined,
      limit: 20,
    });
  });

  it('passes undefined limit when query is not numeric', async () => {
    mockService.getHistory.mockResolvedValue({
      sessions: [],
      metadata: { nextCursor: null, hasMore: false, limit: 20 },
    });

    await controller.getHistory(
      { id: 'user-1' } as { id: string },
      undefined,
      'message',
      'cursor-1',
      'abc',
    );

    expect(mockService.getHistory).toHaveBeenCalledWith('user-1', {
      userId: undefined,
      category: 'message',
      cursor: 'cursor-1',
      limit: undefined,
    });
  });

  it('returns replay link with envelope', async () => {
    mockService.getReplayLink.mockResolvedValue({
      url: 'https://replay.local/1',
    });

    const result = await controller.getReplayLink(
      { id: 'user-1' } as { id: string },
      'session-1',
    );

    expect(result).toEqual({
      data: { url: 'https://replay.local/1' },
      error: null,
    });
    expect(mockService.getReplayLink).toHaveBeenCalledWith(
      'user-1',
      'session-1',
    );
  });

  it('exports history with envelope', async () => {
    mockService.exportHistory.mockResolvedValue({
      exportUrl: 'data:text/csv;base64,Zm9v',
      export_url: 'data:text/csv;base64,Zm9v',
    });

    const result = await controller.exportHistory(
      { id: 'user-1' } as { id: string },
      { user_id: 'user-1', category: 'rdv', format: 'csv' },
    );

    expect(result).toEqual({
      data: {
        exportUrl: 'data:text/csv;base64,Zm9v',
        export_url: 'data:text/csv;base64,Zm9v',
      },
      error: null,
    });

    expect(mockService.exportHistory).toHaveBeenCalledWith('user-1', {
      userId: 'user-1',
      category: 'rdv',
      format: 'csv',
    });
  });
});

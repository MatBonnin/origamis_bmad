import { SupportController } from './support.controller';
import { SupportService } from './support.service';

describe('SupportController', () => {
  const mockService = {
    listIncidents: jest.fn(),
    createIncident: jest.fn(),
    getSessionIncidents: jest.fn(),
    updateIncidentStatus: jest.fn(),
  };

  let controller: SupportController;

  beforeEach(() => {
    controller = new SupportController(mockService as unknown as SupportService);
    jest.clearAllMocks();
  });

  it('returns incidents queue', () => {
    mockService.listIncidents.mockReturnValue({ incidents: [] });
    const result = controller.listIncidents();
    expect(result.error).toBeNull();
  });
});

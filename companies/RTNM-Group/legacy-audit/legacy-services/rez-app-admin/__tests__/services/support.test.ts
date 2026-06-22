jest.mock('../../services/api/apiClient', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

import { apiClient } from '../../services/api/apiClient';
const mockGet = apiClient.get as jest.Mock;
const mockPost = apiClient.post as jest.Mock;
const mockPut = apiClient.put as jest.Mock;
const mockPatch = apiClient.patch as jest.Mock;

let supportService: any;
beforeAll(async () => {
  supportService = (await import('../../services/api/support')).default;
});

describe('SupportService (Admin)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('listTickets returns filtered list', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: { tickets: [{ _id: 't1', subject: 'Refund issue' }] },
    });
    const result = await supportService.listTickets({ status: 'open' });
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('support'));
  });

  it('getTicket fetches by ID', async () => {
    mockGet.mockResolvedValue({ success: true, data: { _id: 't1', subject: 'Refund' } });
    const result = await supportService.getTicket('t1');
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('t1'));
  });

  it('assignTicket assigns to agent', async () => {
    mockPut.mockResolvedValue({ success: true });
    await supportService.assignTicket('t1', 'agent1');
    expect(mockPut).toHaveBeenCalledWith(
      expect.stringContaining('assign'),
      expect.objectContaining({ agentId: 'agent1' })
    );
  });

  it('replyToTicket sends message', async () => {
    mockPost.mockResolvedValue({ success: true });
    await supportService.replyToTicket('t1', 'We are looking into this');
    expect(mockPost).toHaveBeenCalledWith(
      expect.stringContaining('messages'),
      expect.objectContaining({ message: 'We are looking into this' })
    );
  });

  it('updateStatus changes ticket status', async () => {
    mockPut.mockResolvedValue({ success: true });
    await supportService.updateStatus('t1', 'resolved', 'Issue fixed');
    expect(mockPut).toHaveBeenCalled();
  });

  it('getStatistics returns support KPIs', async () => {
    mockGet.mockResolvedValue({
      success: true,
      data: { total: 100, open: 15, avgResolutionTime: 24 },
    });
    const result = await supportService.getStatistics();
    expect(mockGet).toHaveBeenCalledWith(expect.stringContaining('statistics'));
  });
});

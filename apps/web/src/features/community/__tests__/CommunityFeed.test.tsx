import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityFeed } from '../CommunityFeed';

const socketHandlers = new Map<string, ((payload: unknown) => void)[]>();

vi.mock('socket.io-client', () => ({
  io: () => ({
    on: (event: string, cb: (payload: unknown) => void) => {
      const current = socketHandlers.get(event) ?? [];
      current.push(cb);
      socketHandlers.set(event, current);
    },
    off: () => undefined,
    disconnect: () => undefined,
  }),
}));

describe('CommunityFeed', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.resetAllMocks();
    socketHandlers.clear();
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('prompt', vi.fn(() => 'Une reponse'));
  });

  it('loads feed and publishes post', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { posts: [], metadata: { nextCursor: null, hasMore: false } }, error: null }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { post: { id: 'post-1' } }, error: null }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            posts: [
              {
                id: 'post-1',
                authorId: 'student-1',
                title: 'Mon post',
                body: 'Contenu',
                tags: ['aide'],
                status: 'published',
                createdAt: '2026-02-10T10:00:00.000Z',
                repliesCount: 0,
              },
            ],
            metadata: { nextCursor: null, hasMore: false },
          },
          error: null,
        }),
      } as Response);

    render(<CommunityFeed accessToken="token" userId="student-1" />);

    await userEvent.type(screen.getByLabelText('Titre'), 'Mon post');
    await userEvent.type(screen.getByLabelText('Contenu markdown'), 'Contenu');
    await userEvent.click(screen.getByRole('button', { name: 'Publier' }));

    expect(await screen.findByText('Mon post')).toBeInTheDocument();
  });

  it('opens report modal and submits report', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            posts: [
              {
                id: 'post-1',
                authorId: 'student-1',
                title: 'Post a signaler',
                body: 'Contenu',
                tags: [],
                status: 'published',
                createdAt: '2026-02-10T10:00:00.000Z',
                repliesCount: 0,
              },
            ],
            metadata: { nextCursor: null, hasMore: false },
          },
          error: null,
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { report: { id: 'report-1' } }, error: null }),
      } as Response);

    render(<CommunityFeed accessToken="token" userId="student-1" />);

    await userEvent.click(await screen.findByRole('button', { name: 'Signaler' }));
    await userEvent.type(screen.getByLabelText('Raison'), 'Spam');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer' }));

    await waitFor(() => {
      const reportCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('/reports'));
      expect(reportCall).toBeDefined();
    });
  });
});

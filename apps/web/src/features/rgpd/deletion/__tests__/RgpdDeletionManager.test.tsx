import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RgpdDeletionManager } from '../RgpdDeletionManager';

describe('RgpdDeletionManager', () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('submits deletion request', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { request: { status: 'requested' } },
        error: null,
      }),
    } as Response);

    render(<RgpdDeletionManager accessToken="token" userId="user-1" isAdmin={false} />);

    await userEvent.type(screen.getByLabelText('Raison'), 'Je souhaite supprimer mon compte');
    await userEvent.click(screen.getByRole('button', { name: 'Envoyer ma demande' }));

    expect(await screen.findByText('Demande enregistree: requested')).toBeInTheDocument();
  });
});

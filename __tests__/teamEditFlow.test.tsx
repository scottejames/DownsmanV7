import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Home from '@/app/page';

// Fake server: a single Team row, replaced wholesale on every POST (matching
// saveTeam()'s real PutCommand semantics - a full-item overwrite, not a merge).
function mockFetch() {
  let dbTeam: Record<string, unknown> | null = null;

  return jest.fn(async (url: string, options?: RequestInit) => {
    const method = options?.method || 'GET';

    if (url === '/api/auth/session') {
      return { ok: true, json: async () => ({ id: 'user-1', username: 'scott', admin: false, breakLock: false }) };
    }
    if (url.startsWith('/api/teams') && method === 'GET') {
      return { ok: true, json: async () => (dbTeam ? [dbTeam] : []) };
    }
    if (url === '/api/teams' && method === 'POST') {
      const body = JSON.parse(options!.body as string);
      dbTeam = { ...body, id: body.id || (dbTeam && dbTeam.id) || 't1' };
      return { ok: true, json: async () => dbTeam };
    }
    if (url.startsWith('/api/scouts') && method === 'GET') {
      return { ok: true, json: async () => [] };
    }
    if (url.startsWith('/api/support') && method === 'GET') {
      return { ok: true, json: async () => [] };
    }
    throw new Error(`Unhandled fetch in test: ${method} ${url}`);
  });
}

describe('Team edit flow', () => {
  it('keeps a saved hikeClass visible on the next edit, without re-selecting the row', async () => {
    global.fetch = mockFetch() as unknown as typeof fetch;

    render(<Home />);

    // Create a new team (mirrors addTeam()'s real payload - no hikeClass yet).
    fireEvent.click(await screen.findByRole('button', { name: 'Add Team' }));

    // Assign a hike class and save, changing nothing else.
    const hikeClassSelect = await screen.findByRole('combobox');
    fireEvent.change(hikeClassSelect, { target: { value: 'A-Class' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    // Wait for the dialog to actually close (the combobox to disappear) - the
    // "Edit Team" button is always present underneath the modal overlay, so
    // waiting on it alone doesn't prove the save+close cycle actually finished.
    await waitFor(() => expect(screen.queryByRole('combobox')).not.toBeInTheDocument());

    // Reopen via "Edit Team" - NOT by re-clicking the table row - which is exactly
    // the reported repro (create -> assign class -> save -> Edit Team -> class is
    // blank -> saving again silently wipes the class that was just saved).
    fireEvent.click(screen.getByRole('button', { name: 'Edit Team' }));

    expect(await screen.findByRole('combobox')).toHaveValue('A-Class');
  });
});

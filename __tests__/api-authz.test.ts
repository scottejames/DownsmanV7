/**
 * @jest-environment node
 */
// Route handlers use the Fetch API Request/Response globals, which jsdom
// (this project's default test environment) doesn't provide.
import { NextRequest } from 'next/server';

jest.mock('@/services/db', () => ({
  getTeamsByOwner: jest.fn(),
  getAllTeams: jest.fn(),
  saveTeam: jest.fn(async (t) => t),
  deleteTeam: jest.fn(),
  getTeamById: jest.fn(),
  getScoutsByOwner: jest.fn(),
  saveScout: jest.fn(async (s) => s),
  deleteScout: jest.fn(),
}));

jest.mock('@/services/cognito', () => ({
  listUsers: jest.fn(),
}));

import * as db from '@/services/db';
import * as cognito from '@/services/cognito';
import { GET as teamsGet, POST as teamsPost, DELETE as teamsDelete } from '@/app/api/teams/route';
import { POST as scoutsPost } from '@/app/api/scouts/route';
import { GET as adminGet } from '@/app/api/admin/route';

function req(url: string, opts: { method?: string; groups?: string; ownerId?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = {};
  if (opts.ownerId !== undefined) headers['x-user-owner-id'] = opts.ownerId;
  if (opts.groups !== undefined) headers['x-user-sub'] = 'sub-1';
  if (opts.ownerId !== undefined || opts.groups !== undefined) headers['x-user-sub'] = 'sub-1';
  if (opts.groups !== undefined) headers['x-user-groups'] = opts.groups;
  return new NextRequest(url, {
    method: opts.method || 'GET',
    headers,
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
}

beforeEach(() => jest.clearAllMocks());

describe('teams route authorization', () => {
  it('POST ignores a client-supplied ownerID and uses the session identity', async () => {
    const r = req('http://localhost/api/teams', {
      method: 'POST',
      ownerId: 'real-user-id',
      groups: '',
      body: { ownerID: 'someone-elses-id', teamName: 'Test' },
    });
    await teamsPost(r);
    expect(db.saveTeam).toHaveBeenCalledWith(expect.objectContaining({ ownerID: 'real-user-id' }));
  });

  it('GET ?all=true is forbidden without the admin group', async () => {
    const r = req('http://localhost/api/teams?all=true', { ownerId: 'user-1', groups: '' });
    const res = await teamsGet(r);
    expect(res.status).toBe(403);
    expect(db.getAllTeams).not.toHaveBeenCalled();
  });

  it('GET ?all=true succeeds with the admin group', async () => {
    (db.getAllTeams as jest.Mock).mockResolvedValue([]);
    const r = req('http://localhost/api/teams?all=true', { ownerId: 'user-1', groups: 'admin' });
    const res = await teamsGet(r);
    expect(res.status).toBe(200);
    expect(db.getAllTeams).toHaveBeenCalled();
  });

  it('DELETE is forbidden when the team belongs to a different user', async () => {
    (db.getTeamById as jest.Mock).mockResolvedValue({ id: 'team-1', ownerID: 'someone-else' });
    const r = req('http://localhost/api/teams', { method: 'DELETE', ownerId: 'user-1', groups: '', body: { id: 'team-1' } });
    const res = await teamsDelete(r);
    expect(res.status).toBe(403);
    expect(db.deleteTeam).not.toHaveBeenCalled();
  });

  it('DELETE succeeds when the caller owns the team', async () => {
    (db.getTeamById as jest.Mock).mockResolvedValue({ id: 'team-1', ownerID: 'user-1' });
    const r = req('http://localhost/api/teams', { method: 'DELETE', ownerId: 'user-1', groups: '', body: { id: 'team-1' } });
    const res = await teamsDelete(r);
    expect(res.status).toBe(200);
    expect(db.deleteTeam).toHaveBeenCalledWith(expect.objectContaining({ id: 'team-1', ownerID: 'user-1' }));
  });
});

describe('scouts route authorization', () => {
  it('POST is forbidden when the referenced team is not owned by the caller', async () => {
    (db.getTeamById as jest.Mock).mockResolvedValue({ id: 'team-1', ownerID: 'someone-else' });
    const r = req('http://localhost/api/scouts', {
      method: 'POST',
      ownerId: 'user-1',
      groups: '',
      body: { ownerID: 'team-1', fullName: 'A Scout' },
    });
    const res = await scoutsPost(r);
    expect(res.status).toBe(403);
    expect(db.saveScout).not.toHaveBeenCalled();
  });

  it('POST succeeds when the caller owns the referenced team', async () => {
    (db.getTeamById as jest.Mock).mockResolvedValue({ id: 'team-1', ownerID: 'user-1' });
    const r = req('http://localhost/api/scouts', {
      method: 'POST',
      ownerId: 'user-1',
      groups: '',
      body: { ownerID: 'team-1', fullName: 'A Scout' },
    });
    const res = await scoutsPost(r);
    expect(res.status).toBe(200);
    expect(db.saveScout).toHaveBeenCalled();
  });
});

describe('admin route authorization', () => {
  it('GET is forbidden without the admin group', async () => {
    const r = req('http://localhost/api/admin', { ownerId: 'user-1', groups: '' });
    const res = await adminGet(r);
    expect(res.status).toBe(403);
    expect(cognito.listUsers).not.toHaveBeenCalled();
  });

  it('GET succeeds with the admin group', async () => {
    (cognito.listUsers as jest.Mock).mockResolvedValue([]);
    const r = req('http://localhost/api/admin', { ownerId: 'user-1', groups: 'admin' });
    const res = await adminGet(r);
    expect(res.status).toBe(200);
  });
});

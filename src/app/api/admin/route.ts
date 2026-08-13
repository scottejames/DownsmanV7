import { NextRequest, NextResponse } from 'next/server';
import { saveTeam, deleteTeam } from '@/services/db';
import * as cognito from '@/services/cognito';
import { getSession } from '@/lib/authz';

export async function GET(req: NextRequest) {
  const session = getSession(req);
  if (!session.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const users = await cognito.listUsers();
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = getSession(req);
  if (!session.isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { action, ...data } = await req.json();

  if (action === 'toggleAdmin') {
    const isAdmin = await cognito.isInGroup(data.username, 'admin');
    await cognito.setGroupMembership(data.username, 'admin', !isAdmin);
    return NextResponse.json({ ok: true });
  }

  if (action === 'deleteUser') {
    await cognito.adminDeleteUser(data.username);
    return NextResponse.json({ ok: true });
  }

  if (action === 'resetPassword') {
    // A random, non-permanent password forces a real NEW_PASSWORD_REQUIRED
    // challenge on next login, replacing the old fixed 'password1'. The admin
    // needs to relay this to the user out of band (phone/email), so it comes
    // back in the response for AdminPanel to display once.
    const tempPassword = generateTempPassword();
    await cognito.adminSetPassword(data.username, tempPassword, false);
    return NextResponse.json({ ok: true, tempPassword });
  }

  if (action === 'togglePaid') {
    const team = data.team;
    team.paymentRecieved = !team.paymentRecieved;
    await saveTeam(team);
    return NextResponse.json({ ok: true });
  }

  if (action === 'toggleSubmitted') {
    const team = data.team;
    team.teamSubmitted = !team.teamSubmitted;
    await saveTeam(team);
    return NextResponse.json({ ok: true });
  }

  if (action === 'deleteTeam') {
    await deleteTeam(data.team);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

function generateTempPassword(): string {
  // Must satisfy the pool's password policy (6+ chars incl. a number) - see
  // scripts/create-cognito-pool.js.
  return 'Temp-' + Math.floor(100000 + Math.random() * 900000);
}

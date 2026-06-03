import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, updateUser, deleteUser, getAllTeams, saveTeam, deleteTeam } from '@/services/db';
import { hashPassword } from '@/utils/hash';

export async function GET() {
  const users = await getAllUsers();
  const safe = users.map(({ password, ...rest }) => rest);
  return NextResponse.json(safe);
}

export async function POST(req: NextRequest) {
  const { action, ...data } = await req.json();

  if (action === 'toggleAdmin') {
    const users = await getAllUsers();
    const user = users.find(u => u.username === data.username);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    user.admin = !user.admin;
    await updateUser(user);
    return NextResponse.json({ ok: true });
  }

  if (action === 'deleteUser') {
    await deleteUser(data.username);
    return NextResponse.json({ ok: true });
  }

  if (action === 'resetPassword') {
    const users = await getAllUsers();
    const user = users.find(u => u.username === data.username);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    user.password = hashPassword('password1');
    await updateUser(user);
    return NextResponse.json({ ok: true });
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

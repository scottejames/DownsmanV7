import { NextRequest, NextResponse } from 'next/server';
import { login, addUser, findUserByUsername } from '@/services/db';
import { hashPassword } from '@/utils/hash';
import { UserModel } from '@/models/types';

export async function POST(req: NextRequest) {
  const { action, username, password, email, mobile } = await req.json();

  if (action === 'login') {
    const user = await login(username, password);
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    const { password: _, ...safe } = user;
    return NextResponse.json(safe);
  }

  if (action === 'register') {
    if (!username || !password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    if (!hasLetter || !hasDigit) {
      return NextResponse.json({ error: 'Password must contain letters and numbers' }, { status: 400 });
    }
    const existing = await findUserByUsername(username);
    if (existing) return NextResponse.json({ error: 'Username already taken' }, { status: 409 });

    const user: UserModel = {
      username,
      password: hashPassword(password),
      email: email || '',
      mobile: mobile || '',
      admin: false,
      breakLock: false,
    };
    const saved = await addUser(user);
    const { password: _, ...safe } = saved;
    return NextResponse.json(safe);
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

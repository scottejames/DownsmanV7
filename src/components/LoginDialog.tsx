'use client';

import { useState } from 'react';
import { UserModel } from '@/models/types';

interface Props {
  onLogin: (user: Omit<UserModel, 'password'>) => void;
  onClose: () => void;
}

export default function LoginDialog({ onLogin, onClose }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', username, password }),
    });
    if (!res.ok) { setError('Invalid username or password'); return; }
    const user = await res.json();
    onLogin(user);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-80">
        <h2 className="text-xl mb-4">Login</h2>
        {error && <p className="text-red-400 mb-2">{error}</p>}
        <input className="w-full mb-3 p-2 bg-gray-700 rounded" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input className="w-full mb-4 p-2 bg-gray-700 rounded" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700">Cancel</button>
          <button onClick={submit} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">Login</button>
        </div>
      </div>
    </div>
  );
}

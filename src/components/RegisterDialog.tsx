'use client';

import { useState } from 'react';

interface Props { onClose: () => void; }

export default function RegisterDialog({ onClose }: Props) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const submit = async () => {
    if (password !== confirm) { setError('Passwords do not match'); return; }
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', username, password, email, mobile }),
    });
    if (!res.ok) { const d = await res.json(); setError(d.error); return; }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-gray-800 p-6 rounded-lg w-80">
          <h2 className="text-xl mb-4">Success!</h2>
          <p className="mb-4">User {username} registered. You can now login.</p>
          <button onClick={onClose} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">OK</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-80">
        <h2 className="text-xl mb-4">Register</h2>
        {error && <p className="text-red-400 mb-2">{error}</p>}
        <input className="w-full mb-3 p-2 bg-gray-700 rounded" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input className="w-full mb-3 p-2 bg-gray-700 rounded" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="w-full mb-3 p-2 bg-gray-700 rounded" placeholder="Phone" value={mobile} onChange={e => setMobile(e.target.value)} />
        <input className="w-full mb-3 p-2 bg-gray-700 rounded" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <input className="w-full mb-4 p-2 bg-gray-700 rounded" type="password" placeholder="Confirm Password" value={confirm} onChange={e => setConfirm(e.target.value)} />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700">Cancel</button>
          <button onClick={submit} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">Register</button>
        </div>
      </div>
    </div>
  );
}

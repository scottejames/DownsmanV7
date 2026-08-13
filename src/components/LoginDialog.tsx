'use client';

import { useState } from 'react';
import { UserModel } from '@/models/types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Banner from './ui/Banner';
import { inputClass } from './ui/form';
import { postJson, ApiError } from './ui/api';

interface Props {
  onLogin: (user: Omit<UserModel, 'password'>) => void;
  onClose: () => void;
}

export default function LoginDialog({ onLogin, onClose }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [challengeSession, setChallengeSession] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await postJson<{ challenge?: string; session?: string } & Omit<UserModel, 'password'>>('/api/auth', {
        action: 'login', username, password,
      });
      if (data.challenge === 'NEW_PASSWORD_REQUIRED') {
        setChallengeSession(data.session!);
      } else {
        onLogin(data);
      }
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const submitNewPassword = async () => {
    if (newPassword !== confirmNewPassword) { setError('Passwords do not match'); return; }
    setError('');
    setLoading(true);
    try {
      const user = await postJson<Omit<UserModel, 'password'>>('/api/auth', {
        action: 'completeNewPassword', username, newPassword, session: challengeSession,
      });
      onLogin(user);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not set new password');
    } finally {
      setLoading(false);
    }
  };

  if (challengeSession) {
    return (
      <Modal title="Set a new password" onClose={onClose}>
        <p className="mb-4 text-sm text-gray-400">Your password was reset. Choose a new one to continue.</p>
        {error && <Banner tone="error">{error}</Banner>}
        <div className="space-y-3">
          <input className={inputClass} type="password" placeholder="New password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <input className={inputClass} type="password" placeholder="Confirm new password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitNewPassword()} />
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submitNewPassword} loading={loading}>Set password</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title="Login" onClose={onClose}>
      {error && <Banner tone="error">{error}</Banner>}
      <div className="space-y-3">
        <input className={inputClass} placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} />
        <input className={inputClass} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={loading}>Login</Button>
      </div>
    </Modal>
  );
}

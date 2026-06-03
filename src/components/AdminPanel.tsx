'use client';

import { useState, useEffect } from 'react';
import { TeamModel, UserModel } from '@/models/types';

interface Props { onClose: () => void; }

export default function AdminPanel({ onClose }: Props) {
  const [tab, setTab] = useState<'users' | 'teams'>('users');
  const [users, setUsers] = useState<Omit<UserModel, 'password'>[]>([]);
  const [teams, setTeams] = useState<TeamModel[]>([]);

  const loadUsers = () => fetch('/api/admin').then(r => r.json()).then(setUsers);
  const loadTeams = () => fetch('/api/teams?all=true').then(r => r.json()).then(setTeams);

  useEffect(() => { loadUsers(); loadTeams(); }, []);

  const adminAction = async (action: string, data: Record<string, unknown>) => {
    await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...data }) });
    loadUsers();
    loadTeams();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-4xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Admin Panel</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        <div className="flex gap-4 mb-4">
          <button onClick={() => setTab('users')} className={`px-4 py-2 rounded ${tab === 'users' ? 'bg-blue-600' : 'bg-gray-700'}`}>Users</button>
          <button onClick={() => setTab('teams')} className={`px-4 py-2 rounded ${tab === 'teams' ? 'bg-blue-600' : 'bg-gray-700'}`}>Teams</button>
        </div>

        {tab === 'users' && (
          <table className="w-full">
            <thead><tr className="border-b border-gray-600"><th className="text-left p-2">Username</th><th className="text-left p-2">Admin</th><th className="p-2">Actions</th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.username} className="border-b border-gray-700">
                  <td className="p-2">{u.username}</td>
                  <td className="p-2">{u.admin ? 'Yes' : 'No'}</td>
                  <td className="p-2 text-right space-x-2">
                    <button onClick={() => adminAction('toggleAdmin', { username: u.username })} className="text-blue-400 hover:underline">Toggle Admin</button>
                    <button onClick={() => adminAction('resetPassword', { username: u.username })} className="text-yellow-400 hover:underline">Reset Password</button>
                    <button onClick={() => adminAction('deleteUser', { username: u.username })} className="text-red-400 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'teams' && (
          <table className="w-full">
            <thead><tr className="border-b border-gray-600"><th className="text-left p-2">Leader</th><th className="text-left p-2">Team</th><th className="text-left p-2">Class</th><th className="text-left p-2">Paid</th><th className="text-left p-2">Submitted</th><th className="p-2">Actions</th></tr></thead>
            <tbody>
              {teams.map(t => (
                <tr key={t.id} className="border-b border-gray-700">
                  <td className="p-2">{t.leaderName}</td>
                  <td className="p-2">{t.teamName}</td>
                  <td className="p-2">{t.hikeClass || '-'}</td>
                  <td className="p-2">{t.paymentRecieved ? 'Yes' : `£${t.paymentAmount}`}</td>
                  <td className="p-2">{t.teamSubmitted ? 'Yes' : 'No'}</td>
                  <td className="p-2 text-right space-x-2">
                    <button onClick={() => adminAction('togglePaid', { team: t })} className="text-blue-400 hover:underline">Toggle Paid</button>
                    <button onClick={() => adminAction('toggleSubmitted', { team: t })} className="text-yellow-400 hover:underline">Toggle Submitted</button>
                    <button onClick={() => adminAction('deleteTeam', { team: t })} className="text-red-400 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

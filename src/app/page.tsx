'use client';

import { useState, useEffect, useCallback } from 'react';
import { TeamModel, ScoutModel, SupportModel, UserModel } from '@/models/types';
import LoginDialog from '@/components/LoginDialog';
import RegisterDialog from '@/components/RegisterDialog';
import TeamDialog from '@/components/TeamDialog';
import AdminPanel from '@/components/AdminPanel';

export default function Home() {
  const [user, setUser] = useState<Omit<UserModel, 'password'> | null>(null);
  const [teams, setTeams] = useState<TeamModel[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<TeamModel | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [showTeamDialog, setShowTeamDialog] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const locked = process.env.NEXT_PUBLIC_DM_LOCK === 'true';

  const loadTeams = useCallback(async () => {
    if (!user?.id) return;
    const res = await fetch(`/api/teams?ownerID=${user.id}`);
    const data = await res.json();
    setTeams(data);
  }, [user?.id]);

  useEffect(() => { loadTeams(); }, [loadTeams]);

  const handleLogin = (u: Omit<UserModel, 'password'>) => {
    setUser(u);
    setShowLogin(false);
  };

  const addTeam = async () => {
    if (!user) return;
    const team: TeamModel = {
      ownerID: user.id!,
      teamName: 'New Team',
      leaderName: user.username,
      paymentAmount: 0,
      paymentRecieved: false,
      teamSubmitted: false,
      campingAtStart: false,
      committedToRun: false,
    };
    const res = await fetch('/api/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(team) });
    const saved = await res.json();
    setSelectedTeam(saved);
    setShowTeamDialog(true);
    loadTeams();
  };

  const deleteTeamHandler = async () => {
    if (!selectedTeam) return;
    await fetch('/api/teams', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(selectedTeam) });
    setSelectedTeam(null);
    loadTeams();
  };

  const editTeam = () => {
    if (selectedTeam) setShowTeamDialog(true);
  };

  if (!user) {
    return (
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Downsman</h1>
        {process.env.NEXT_PUBLIC_DM_DEV === 'true' && (
          <p className="text-yellow-400 mb-4">This is DEVELOPMENT</p>
        )}
        <div className="flex gap-4">
          <button onClick={() => setShowLogin(true)} className="bg-scout-purple px-4 py-2 rounded hover:bg-scout-purple-light">Login</button>
          <button onClick={() => setShowRegister(true)} className="bg-scout-teal-light px-4 py-2 rounded hover:bg-scout-teal">Register</button>
        </div>
        {showLogin && <LoginDialog onLogin={handleLogin} onClose={() => setShowLogin(false)} />}
        {showRegister && <RegisterDialog onClose={() => setShowRegister(false)} />}
      </main>
    );
  }

  const effectiveLocked = locked && !user.breakLock;

  return (
    <main className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Downsman</h1>
        <div className="flex items-center gap-4">
          {process.env.NEXT_PUBLIC_DM_DEV === 'true' && <span className="text-yellow-400">DEV</span>}
          {effectiveLocked && <span className="text-red-400">LOCKED</span>}
          <span>Logged in: {user.username}</span>
          {user.admin && <button onClick={() => setShowAdmin(true)} className="bg-scout-purple px-3 py-1 rounded hover:bg-scout-purple-light">Admin</button>}
          <button onClick={() => setUser(null)} className="bg-scout-teal-light px-3 py-1 rounded hover:bg-scout-teal">Logout</button>
        </div>
      </div>

      {effectiveLocked && (
        <p className="text-red-300 mb-4">Entries have been CLOSED. If you need changes please mail web@downsman.com</p>
      )}

      <table className="w-full border-collapse mb-4">
        <thead>
          <tr className="border-b border-gray-600">
            <th className="text-left p-2">Team Name</th>
            <th className="text-left p-2">Hike Class</th>
            <th className="text-left p-2">Submitted</th>
            <th className="text-left p-2">Amount Paid</th>
            <th className="text-left p-2">Payment Received</th>
          </tr>
        </thead>
        <tbody>
          {teams.map(t => (
            <tr
              key={t.id}
              onClick={() => setSelectedTeam(t)}
              className={`border-b border-gray-700 cursor-pointer hover:bg-scout-purple/20 ${selectedTeam?.id === t.id ? 'bg-scout-purple/30' : ''}`}
            >
              <td className="p-2">{t.teamName}</td>
              <td className="p-2">{t.hikeClass || '-'}</td>
              <td className="p-2">{t.teamSubmitted ? 'Yes' : 'No'}</td>
              <td className="p-2">£{t.paymentAmount}</td>
              <td className="p-2">{t.paymentRecieved ? 'Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-4">
        <button onClick={deleteTeamHandler} disabled={!selectedTeam || effectiveLocked} className="bg-red-600 px-4 py-2 rounded disabled:opacity-50 hover:bg-red-700">Delete Team</button>
        <button onClick={editTeam} disabled={!selectedTeam} className="bg-scout-purple px-4 py-2 rounded disabled:opacity-50 hover:bg-scout-purple-light">{effectiveLocked ? 'View Team' : 'Edit Team'}</button>
        {!effectiveLocked && <button onClick={addTeam} className="bg-green-600 px-4 py-2 rounded hover:bg-green-700">Add Team</button>}
      </div>

      {showTeamDialog && selectedTeam && (
        <TeamDialog team={selectedTeam} locked={effectiveLocked} onClose={() => { setShowTeamDialog(false); loadTeams(); }} />
      )}

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
    </main>
  );
}

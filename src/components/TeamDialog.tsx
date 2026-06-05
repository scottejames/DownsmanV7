'use client';

import { useState, useEffect } from 'react';
import { TeamModel, ScoutModel, SupportModel } from '@/models/types';
import { HIKE_CLASSES } from '@/models/referenceData';
import { validateTeam, getEntranceFee } from '@/utils/validation';
import ScoutDialog from './ScoutDialog';
import SupportDialogComponent from './SupportDialog';

interface Props {
  team: TeamModel;
  locked: boolean;
  onClose: () => void;
}

export default function TeamDialog({ team, locked, onClose }: Props) {
  const [model, setModel] = useState<TeamModel>({ ...team });
  const [scouts, setScouts] = useState<ScoutModel[]>([]);
  const [support, setSupport] = useState<SupportModel[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [showScoutDialog, setShowScoutDialog] = useState(false);
  const [editingScout, setEditingScout] = useState<ScoutModel | null>(null);
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [editingSupport, setEditingSupport] = useState<SupportModel | null>(null);

  const disabled = model.teamSubmitted || locked;

  useEffect(() => {
    if (team.id) {
      fetch(`/api/scouts?ownerID=${team.id}`).then(r => r.json()).then(setScouts);
      fetch(`/api/support?ownerID=${team.id}`).then(r => r.json()).then(setSupport);
    }
  }, [team.id]);

  const update = (field: keyof TeamModel, value: string | boolean) => {
    setModel(m => ({ ...m, [field]: value }));
  };

  const save = async (close = true) => {
    await fetch('/api/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(model) });
    if (close) onClose();
  };

  const validate = () => {
    const errs = validateTeam(model, scouts, support);
    setErrors(errs);
    return errs.length === 0;
  };

  const submitTeam = async () => {
    if (validate()) {
      setModel(m => ({ ...m, teamSubmitted: true }));
      await fetch('/api/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...model, teamSubmitted: true }) });
      onClose();
    }
  };

  const withdrawTeam = async () => {
    setModel(m => ({ ...m, teamSubmitted: false }));
    await fetch('/api/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...model, teamSubmitted: false }) });
    onClose();
  };

  const saveScout = async (scout: ScoutModel) => {
    scout.ownerID = team.id!;
    const res = await fetch('/api/scouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scout) });
    const saved = await res.json();
    setScouts(prev => {
      const idx = prev.findIndex(s => s.id === saved.id);
      return idx >= 0 ? prev.map(s => s.id === saved.id ? saved : s) : [...prev, saved];
    });
    setShowScoutDialog(false);
    setEditingScout(null);
  };

  const deleteScout = async (scout: ScoutModel) => {
    await fetch('/api/scouts', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ownerID: scout.ownerID, id: scout.id }) });
    setScouts(prev => prev.filter(s => s.id !== scout.id));
  };

  const saveSupportMember = async (s: SupportModel) => {
    s.ownerID = team.id!;
    const res = await fetch('/api/support', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) });
    const saved = await res.json();
    setSupport(prev => {
      const idx = prev.findIndex(x => x.id === saved.id);
      return idx >= 0 ? prev.map(x => x.id === saved.id ? saved : x) : [...prev, saved];
    });
    setShowSupportDialog(false);
    setEditingSupport(null);
  };

  const deleteSupportMember = async (s: SupportModel) => {
    await fetch('/api/support', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ownerID: s.ownerID, id: s.id }) });
    setSupport(prev => prev.filter(x => x.id !== s.id));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-scout-teal p-6 rounded-lg w-full max-w-3xl my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Team: {model.teamName}</h2>
          <span className="text-sm text-gray-400">
            Payment: {model.paymentRecieved ? 'Paid' : `£${model.paymentAmount}`} | Submitted: {model.teamSubmitted ? 'Yes' : 'No'}
          </span>
        </div>

        {errors.length > 0 && (
          <div className="bg-red-900/50 border border-red-600 p-3 rounded mb-4">
            {errors.map((e, i) => <p key={i} className="text-red-300 text-sm">{e}</p>)}
          </div>
        )}

        {/* Team Details */}
        <fieldset disabled={disabled} className="mb-6">
          <legend className="text-lg font-semibold mb-2">Team Details</legend>
          <div className="grid grid-cols-2 gap-3">
            <input className="p-2 bg-scout-teal-light rounded" placeholder="Team Name" value={model.teamName || ''} onChange={e => update('teamName', e.target.value)} />
            <select className="p-2 bg-scout-teal-light rounded" value={model.hikeClass || ''} onChange={e => update('hikeClass', e.target.value)}>
              <option value="">Select Hike Class</option>
              {HIKE_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input className="p-2 bg-scout-teal-light rounded" placeholder="Section" value={model.section || ''} onChange={e => update('section', e.target.value)} />
            <input className="p-2 bg-scout-teal-light rounded" placeholder="Group Name" value={model.groupName || ''} onChange={e => update('groupName', e.target.value)} />
            <input className="p-2 bg-scout-teal-light rounded" placeholder="District" value={model.district || ''} onChange={e => update('district', e.target.value)} />
            <input className="p-2 bg-scout-teal-light rounded" placeholder="County" value={model.county || ''} onChange={e => update('county', e.target.value)} />
          </div>
        </fieldset>

        {/* Phones */}
        <fieldset disabled={disabled} className="mb-6">
          <legend className="text-lg font-semibold mb-2">Team Phones</legend>
          <div className="grid grid-cols-2 gap-3">
            <input className="p-2 bg-scout-teal-light rounded" placeholder="Active Phone" value={model.activeMobile || ''} onChange={e => update('activeMobile', e.target.value)} />
            <input className="p-2 bg-scout-teal-light rounded" placeholder="Backup Phone" value={model.backupMobile || ''} onChange={e => update('backupMobile', e.target.value)} />
          </div>
        </fieldset>

        {/* Scouts */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Hiking Team</h3>
          <table className="w-full mb-2">
            <thead><tr className="border-b border-gray-600"><th className="text-left p-1">Name</th><th className="text-left p-1">DOB</th><th className="text-left p-1">Leader</th><th className="p-1"></th></tr></thead>
            <tbody>
              {scouts.map(s => (
                <tr key={s.id} className="border-b border-gray-700">
                  <td className="p-1">{s.fullName}</td>
                  <td className="p-1">{s.dobEpoch ? new Date(s.dobEpoch * 86400000).toLocaleDateString('en-GB') : 'N/A'}</td>
                  <td className="p-1">{s.leader ? 'Yes' : 'No'}</td>
                  <td className="p-1 text-right">
                    {!disabled && <>
                      <button onClick={() => { setEditingScout(s); setShowScoutDialog(true); }} className="text-blue-400 mr-2 hover:underline">Edit</button>
                      <button onClick={() => deleteScout(s)} className="text-red-400 hover:underline">Delete</button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!disabled && <button onClick={() => { setEditingScout(null); setShowScoutDialog(true); }} className="bg-green-600 px-3 py-1 rounded hover:bg-green-700">Add Scout</button>}
        </div>

        {/* Support */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Support Team</h3>
          <table className="w-full mb-2">
            <thead><tr className="border-b border-gray-600"><th className="text-left p-1">Name</th><th className="text-left p-1">Phone</th><th className="text-left p-1">From</th><th className="text-left p-1">To</th><th className="p-1"></th></tr></thead>
            <tbody>
              {support.map(s => (
                <tr key={s.id} className="border-b border-gray-700">
                  <td className="p-1">{s.fullName}</td>
                  <td className="p-1">{s.phoneNumber}</td>
                  <td className="p-1">{s.from}</td>
                  <td className="p-1">{s.to}</td>
                  <td className="p-1 text-right">
                    {!disabled && <>
                      <button onClick={() => { setEditingSupport(s); setShowSupportDialog(true); }} className="text-blue-400 mr-2 hover:underline">Edit</button>
                      <button onClick={() => deleteSupportMember(s)} className="text-red-400 hover:underline">Delete</button>
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!disabled && <button onClick={() => { setEditingSupport(null); setShowSupportDialog(true); }} className="bg-green-600 px-3 py-1 rounded hover:bg-green-700">Add Support</button>}
        </div>

        {/* Emergency Contact */}
        <fieldset disabled={disabled} className="mb-6">
          <legend className="text-lg font-semibold mb-2">Emergency Contact</legend>
          <div className="grid grid-cols-2 gap-3">
            <input className="p-2 bg-scout-teal-light rounded" placeholder="Name" value={model.emergencyContactName || ''} onChange={e => update('emergencyContactName', e.target.value)} />
            <input className="p-2 bg-scout-teal-light rounded" placeholder="Email" value={model.emergencyContactEmail || ''} onChange={e => update('emergencyContactEmail', e.target.value)} />
            <input className="p-2 bg-scout-teal-light rounded" placeholder="Mobile" value={model.emergencyContactMobile || ''} onChange={e => update('emergencyContactMobile', e.target.value)} />
            <input className="p-2 bg-scout-teal-light rounded" placeholder="Landline" value={model.emergencyContactLandline || ''} onChange={e => update('emergencyContactLandline', e.target.value)} />
          </div>
        </fieldset>

        {/* Buttons */}
        <div className="flex gap-3 justify-end">
          {!disabled && (
            <>
              <button onClick={validate} className="bg-yellow-600 px-4 py-2 rounded hover:bg-yellow-700">Validate</button>
              {!model.teamSubmitted
                ? <button onClick={submitTeam} className="bg-green-600 px-4 py-2 rounded hover:bg-green-700">Submit Team</button>
                : <button onClick={withdrawTeam} className="bg-orange-600 px-4 py-2 rounded hover:bg-orange-700">Withdraw</button>
              }
              <button onClick={() => save(true)} className="bg-scout-purple px-4 py-2 rounded hover:bg-scout-purple-light">Save</button>
            </>
          )}
          <button onClick={onClose} className="bg-scout-teal-light px-4 py-2 rounded hover:bg-scout-teal">Cancel</button>
        </div>

        {showScoutDialog && <ScoutDialog scout={editingScout} onSave={saveScout} onClose={() => setShowScoutDialog(false)} />}
        {showSupportDialog && <SupportDialogComponent support={editingSupport} onSave={saveSupportMember} onClose={() => setShowSupportDialog(false)} />}
      </div>
    </div>
  );
}

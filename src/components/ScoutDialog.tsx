'use client';

import { useState } from 'react';
import { ScoutModel } from '@/models/types';

interface Props {
  scout: ScoutModel | null;
  onSave: (scout: ScoutModel) => void;
  onClose: () => void;
}

export default function ScoutDialog({ scout, onSave, onClose }: Props) {
  const [fullName, setFullName] = useState(scout?.fullName || '');
  const [dob, setDob] = useState(scout?.dobEpoch ? new Date(scout.dobEpoch * 86400000).toISOString().split('T')[0] : '');
  const [leader, setLeader] = useState(scout?.leader || false);
  const [medicalNotes, setMedicalNotes] = useState(scout?.medicalNotes || '');

  const save = () => {
    const dobEpoch = dob ? Math.floor(new Date(dob + 'T00:00:00Z').getTime() / 86400000) : 0;
    onSave({
      ...(scout || { ownerID: '' }),
      id: scout?.id,
      fullName,
      dobEpoch: leader ? 0 : dobEpoch,
      leader,
      medicalNotes,
    } as ScoutModel);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-gray-800 p-6 rounded-lg w-96">
        <h2 className="text-xl mb-4">{scout ? 'Edit' : 'Add'} Scout</h2>
        <input className="w-full mb-3 p-2 bg-gray-700 rounded" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
        <input className="w-full mb-3 p-2 bg-gray-700 rounded" type="date" disabled={leader} value={dob} onChange={e => setDob(e.target.value)} />
        <label className="flex items-center gap-2 mb-3">
          <input type="checkbox" checked={leader} onChange={e => setLeader(e.target.checked)} />
          Scout Leader (walking with open team)
        </label>
        <textarea className="w-full mb-4 p-2 bg-gray-700 rounded h-24" placeholder="Medical Notes" value={medicalNotes} onChange={e => setMedicalNotes(e.target.value)} />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-700">Cancel</button>
          <button onClick={save} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  );
}

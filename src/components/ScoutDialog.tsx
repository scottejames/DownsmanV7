'use client';

import { useState } from 'react';
import { ScoutModel } from '@/models/types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Banner from './ui/Banner';
import { inputClass, textareaClass, checkboxLabelClass } from './ui/form';
import { ApiError } from './ui/api';

interface Props {
  scout: ScoutModel | null;
  onSave: (scout: ScoutModel) => Promise<void>;
  onClose: () => void;
}

export default function ScoutDialog({ scout, onSave, onClose }: Props) {
  const [fullName, setFullName] = useState(scout?.fullName || '');
  const [dob, setDob] = useState(scout?.dobEpoch ? new Date(scout.dobEpoch * 86400000).toISOString().split('T')[0] : '');
  const [leader, setLeader] = useState(scout?.leader || false);
  const [medicalNotes, setMedicalNotes] = useState(scout?.medicalNotes || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    const dobEpoch = dob ? Math.floor(new Date(dob + 'T00:00:00Z').getTime() / 86400000) : 0;
    setError('');
    setLoading(true);
    try {
      await onSave({
        ...(scout || { ownerID: '' }),
        id: scout?.id,
        fullName,
        dobEpoch: leader ? 0 : dobEpoch,
        leader,
        medicalNotes,
      } as ScoutModel);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save scout');
      setLoading(false);
    }
  };

  return (
    <Modal title={scout ? 'Edit Scout' : 'Add Scout'} onClose={onClose} zIndexClass="z-[60]">
      {error && <Banner tone="error">{error}</Banner>}
      <div className="space-y-3">
        <input className={inputClass} placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
        <input className={inputClass} type="date" disabled={leader} value={dob} onChange={e => setDob(e.target.value)} />
        <label className={checkboxLabelClass}>
          <input type="checkbox" checked={leader} onChange={e => setLeader(e.target.checked)} />
          Scout Leader (walking with open team)
        </label>
        <textarea className={`${textareaClass} h-24`} placeholder="Medical Notes" value={medicalNotes} onChange={e => setMedicalNotes(e.target.value)} />
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={save} loading={loading}>Save</Button>
      </div>
    </Modal>
  );
}

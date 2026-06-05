'use client';

import { useState } from 'react';
import { SupportModel } from '@/models/types';

interface Props {
  support: SupportModel | null;
  onSave: (s: SupportModel) => void;
  onClose: () => void;
}

export default function SupportDialog({ support, onSave, onClose }: Props) {
  const [fullName, setFullName] = useState(support?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(support?.phoneNumber || '');
  const [from, setFrom] = useState(support?.from || '');
  const [to, setTo] = useState(support?.to || '');

  const save = () => {
    onSave({
      ...(support || { ownerID: '' }),
      id: support?.id,
      fullName,
      phoneNumber,
      from,
      to,
    } as SupportModel);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-scout-teal p-6 rounded-lg w-96">
        <h2 className="text-xl mb-4">{support ? 'Edit' : 'Add'} Support Member</h2>
        <input className="w-full mb-3 p-2 bg-scout-teal-light rounded" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
        <input className="w-full mb-3 p-2 bg-scout-teal-light rounded" placeholder="Phone Number" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
        <input className="w-full mb-3 p-2 bg-scout-teal-light rounded" placeholder="From (checkpoint)" value={from} onChange={e => setFrom(e.target.value)} />
        <input className="w-full mb-4 p-2 bg-scout-teal-light rounded" placeholder="To (checkpoint)" value={to} onChange={e => setTo(e.target.value)} />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-scout-teal-light rounded hover:bg-scout-teal">Cancel</button>
          <button onClick={save} className="px-4 py-2 bg-scout-purple rounded hover:bg-scout-purple-light">Save</button>
        </div>
      </div>
    </div>
  );
}

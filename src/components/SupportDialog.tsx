'use client';

import { useState, useRef } from 'react';
import { SupportModel } from '@/models/types';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Banner from './ui/Banner';
import { inputClass } from './ui/form';
import { ApiError } from './ui/api';

interface Props {
  support: SupportModel | null;
  onSave: (s: SupportModel) => Promise<void>;
  onClose: () => void;
}

export default function SupportDialog({ support, onSave, onClose }: Props) {
  const [fullName, setFullName] = useState(support?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(support?.phoneNumber || '');
  const [from, setFrom] = useState(support?.from || '');
  const [to, setTo] = useState(support?.to || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Synchronous guard against a fast double-click, which a state-only check can miss -
  // saveSupport() mints a fresh row whenever there's no existing id. See
  // CODE_REVIEW_2026-08-13.md's H2.
  const savingRef = useRef(false);

  const save = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setError('');
    setLoading(true);
    try {
      await onSave({
        ...(support || { ownerID: '' }),
        id: support?.id,
        fullName,
        phoneNumber,
        from,
        to,
      } as SupportModel);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save support contact');
      setLoading(false);
      savingRef.current = false;
    }
  };

  return (
    <Modal title={support ? 'Edit Support Member' : 'Add Support Member'} onClose={onClose} zIndexClass="z-[60]">
      {error && <Banner tone="error">{error}</Banner>}
      <div className="space-y-3">
        <input className={inputClass} placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
        <input className={inputClass} placeholder="Phone Number" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
        <input className={inputClass} placeholder="From (checkpoint)" value={from} onChange={e => setFrom(e.target.value)} />
        <input className={inputClass} placeholder="To (checkpoint)" value={to} onChange={e => setTo(e.target.value)} />
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={save} loading={loading}>Save</Button>
      </div>
    </Modal>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { ConfigVar } from '@/models/types';
import Modal from './ui/Modal';
import Banner from './ui/Banner';
import { apiRequest, ApiError } from './ui/api';

interface Props { onClose: () => void; }

export default function SystemConfig({ onClose }: Props) {
  const [vars, setVars] = useState<ConfigVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiRequest<ConfigVar[]>('/api/admin/config')
      .then(setVars)
      .catch(e => setError(e instanceof ApiError ? e.message : 'Could not load system config'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Modal title="System Config" subtitle="Live environment variables for this deployment" onClose={onClose} maxWidthClass="max-w-3xl" zIndexClass="z-[60]">
      {error && <Banner tone="error">{error}</Banner>}
      {loading ? (
        <p className="py-8 text-center text-sm text-gray-400">Loading...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-scout-field-border text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="p-2 font-medium">Variable</th>
                <th className="p-2 font-medium">Value</th>
                <th className="p-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {vars.map(v => (
                <tr key={v.key} className="border-b border-scout-field-border/60 align-top">
                  <td className="p-2 font-mono text-xs whitespace-nowrap">{v.key}</td>
                  <td className="p-2 font-mono text-xs">
                    {v.value === null
                      ? <span className="text-red-400">(not set)</span>
                      : v.value === ''
                        ? <span className="text-gray-500">(empty)</span>
                        : v.value}
                  </td>
                  <td className="p-2 text-gray-400">{v.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

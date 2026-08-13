'use client';

import { ReactNode, useEffect } from 'react';

interface Props {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  maxWidthClass?: string;
  zIndexClass?: string;
  children: ReactNode;
}

export default function Modal({ title, subtitle, onClose, maxWidthClass = 'max-w-sm', zIndexClass = 'z-50', children }: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className={`fixed inset-0 ${zIndexClass} flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm`}>
      <div className={`my-8 w-full ${maxWidthClass} max-h-[90vh] overflow-y-auto rounded-xl bg-scout-surface shadow-2xl ring-1 ring-white/10`}>
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-100">{title}</h2>
            {subtitle && <div className="mt-0.5 text-sm text-gray-400">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex-none rounded-md p-1 text-gray-400 transition hover:bg-white/10 hover:text-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-scout-purple-light"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

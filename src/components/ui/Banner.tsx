'use client';

import { ReactNode } from 'react';

type Tone = 'error' | 'success' | 'warning';

interface Props {
  tone: Tone;
  children: ReactNode;
}

const TONE_CLASSES: Record<Tone, string> = {
  error: 'bg-red-950/50 border-red-800 text-red-300',
  success: 'bg-emerald-950/50 border-emerald-800 text-emerald-300',
  warning: 'bg-amber-950/50 border-amber-800 text-amber-300',
};

// Single warning-triangle glyph for error/warning, a check-circle for success -
// kept to two shapes since these are the only two things this app needs to say.
const WARNING_PATH = 'M9.401 3.003c1.155-2 4.043-2 5.198 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z';
const CHECK_PATH = 'M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm4.03 7.28a.75.75 0 00-1.06-1.06l-4.72 4.72-1.72-1.72a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.06 0l5.25-5.25z';

export default function Banner({ tone, children }: Props) {
  const path = tone === 'success' ? CHECK_PATH : WARNING_PATH;
  return (
    <div role="alert" className={`mb-4 flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${TONE_CLASSES[tone]}`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 flex-none" aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d={path} />
      </svg>
      <div className="min-w-0 space-y-0.5">{children}</div>
    </div>
  );
}

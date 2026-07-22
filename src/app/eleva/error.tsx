'use client';

import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import Link from 'next/link';

export default function ElevaError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen px-6" style={{ background: 'rgb(var(--eleva-bg))' }}>
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(239,68,68,0.1)' }}>
          <Sparkles className="w-8 h-8" style={{ color: 'rgb(var(--eleva-danger))' }} strokeWidth={1.5} />
        </div>
        <h1 className="font-display text-2xl font-semibold mb-2" style={{ color: 'rgb(var(--eleva-fg))' }}>Something went wrong</h1>
        <p className="text-[14px] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
          {error.message || 'An unexpected error occurred.'}
        </p>
        {error.digest && <p className="text-[11px] font-mono mb-6" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Error ID: {error.digest}</p>}
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className="eleva-btn-primary text-[13px] inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" />Try again
          </button>
          <Link href="/eleva/dashboard" className="eleva-btn-ghost text-[13px] inline-flex items-center gap-2">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

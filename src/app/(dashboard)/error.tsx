'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 bg-red-50">
          <AlertTriangle className="w-8 h-8 text-red-500" strokeWidth={1.5} />
        </div>
        <h1 className="text-2xl font-semibold mb-2 text-gray-900">Something went wrong</h1>
        <p className="text-sm text-gray-500 mb-6">{error.message || 'An unexpected error occurred.'}</p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={reset} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium shadow-lg shadow-purple-400/20 hover:shadow-xl hover:-translate-y-0.5 transition-all">
            Try again
          </button>
          <Link href="/home" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

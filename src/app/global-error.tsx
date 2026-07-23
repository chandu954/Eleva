'use client';

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);

  return (
    <html>
      <body>
        <div className="flex items-center justify-center min-h-screen px-6" style={{ background: '#f8fafc' }}>
          <div className="text-center max-w-md">
            <h1 className="text-2xl font-semibold mb-2 text-gray-900">Critical error</h1>
            <p className="text-sm text-gray-500 mb-6">{error.message || 'Something went wrong.'}</p>
            <button onClick={reset} className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium">Try again</button>
          </div>
        </div>
      </body>
    </html>
  );
}

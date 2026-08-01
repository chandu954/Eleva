'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { ElevaLogo } from '../../_components/eleva-logo';
import { Loader2, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/eleva/auth/update-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'rgb(var(--eleva-bg))' }}>
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Link href="/eleva"><ElevaLogo size={22} /></Link>
          </div>
          <h1 className="font-display text-xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>
            Reset your password
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.94)',
            border: '1px solid rgba(148,163,184,0.22)',
            boxShadow: '0 24px 70px rgba(15,23,42,0.08)',
          }}
        >
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(34,197,94,0.1)' }}>
                <CheckCircle2 className="w-6 h-6" style={{ color: 'rgb(var(--eleva-success))' }} />
              </div>
              <p className="text-[14px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>Check your email</p>
              <p className="text-[12px] mt-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                We&apos;ve sent a reset link to <strong>{email}</strong>
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="text-[12px] font-medium mb-1.5 block" style={{ color: 'rgb(var(--eleva-fg))' }}>Email</label>
                <input
                  id="reset-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className={`eleva-input ${err ? 'eleva-input-error' : ''}`}
                />
              </div>
              {err && (
                <div className="flex items-start gap-2 text-[12px] p-2.5 rounded-lg" style={{ background: 'rgba(239,68,68,.08)', color: 'rgb(var(--eleva-danger))' }} role="alert">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{err}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={busy}
                className="eleva-btn-gradient w-full h-12 rounded-xl font-medium text-white inline-flex items-center justify-center gap-2 disabled:opacity-60 text-[14px]"
              >
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : 'Send reset link'}
              </button>
            </form>
          )}
        </div>
        <div className="mt-6 text-center">
          <Link href="/eleva/auth/login" className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

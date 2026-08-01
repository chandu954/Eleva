'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ElevaLogo } from '../../_components/eleva-logo';
import { Loader2, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const sb = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    sb.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace('/eleva/auth/login');
      else setChecking(false);
    });
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) { setErr('Passwords do not match.'); return; }
    if (password.length < 6) { setErr('Password must be at least 6 characters.'); return; }
    setBusy(true);
    try {
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
      const { error } = await sb.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      setTimeout(() => router.push('/eleva/dashboard'), 2000);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'rgb(var(--eleva-bg))' }}>
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'rgb(var(--eleva-primary))' }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'rgb(var(--eleva-bg))' }}>
      <div className="w-full max-w-[400px]">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <Link href="/eleva"><ElevaLogo size={22} /></Link>
          </div>
          <h1 className="font-display text-xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>
            Update your password
          </h1>
          <p className="mt-1 text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Choose a new password for your account.
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
          {done ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(34,197,94,0.1)' }}>
                <CheckCircle2 className="w-6 h-6" style={{ color: 'rgb(var(--eleva-success))' }} />
              </div>
              <p className="text-[14px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>Password updated</p>
              <p className="text-[12px] mt-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                Redirecting to your workspace...
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label htmlFor="new-password" className="text-[12px] font-medium mb-1.5 block" style={{ color: 'rgb(var(--eleva-fg))' }}>New password</label>
                <div className="relative">
                  <input
                    id="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPw ? 'text' : 'password'}
                    placeholder="Min. 6 characters"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    className={`eleva-input ${err ? 'eleva-input-error' : ''}`}
                    style={{ paddingRight: 44 }}
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(var(--eleva-muted-fg))' }} aria-label={showPw ? 'Hide password' : 'Show password'} tabIndex={-1}>
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="confirm-password" className="text-[12px] font-medium mb-1.5 block" style={{ color: 'rgb(var(--eleva-fg))' }}>Confirm password</label>
                <input
                  id="confirm-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  type="password"
                  placeholder="Repeat your password"
                  required
                  autoComplete="new-password"
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
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

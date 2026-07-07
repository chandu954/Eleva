'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { ElevaLogo } from '../_components/eleva-logo';
import { Mail, Lock, Loader2, ArrowRight, AlertCircle } from 'lucide-react';

const supabase = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const next = params.get('next') || '/eleva/dashboard';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const sb = supabase();
    try {
      if (mode === 'signup') {
        const { error } = await sb.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/eleva/auth/callback?next=${encodeURIComponent(next)}`,
            data: { first_name: firstName },
          },
        });
        if (error) throw error;
        setErr('Check your email to confirm your account, then log in.');
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      }
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const sb = supabase();
    const { error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/eleva/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) { setErr(error.message); setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      <div className="eleva-orb" style={{ top: -60, left: -80, width: 380, height: 380, background: 'rgb(var(--eleva-primary))' }} />
      <div className="eleva-orb" style={{ bottom: -80, right: -80, width: 420, height: 420, background: 'rgb(var(--eleva-secondary))' }} />

      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm relative z-10"
      >
        <Link href="/eleva" className="flex justify-center mb-8"><ElevaLogo /></Link>
        <div className="eleva-card p-8">
          <h1 className="font-display text-2xl font-semibold text-center mb-1" style={{ color: 'rgb(var(--eleva-fg))' }}>
            {mode === 'signup' ? 'Create your workspace' : 'Welcome back'}
          </h1>
          <p className="text-[13px] text-center mb-6" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            {mode === 'signup' ? 'Elevate every opportunity.' : 'Sign in to continue elevating.'}
          </p>

          <button
            onClick={google} disabled={busy}
            className="w-full h-10 rounded-lg flex items-center justify-center gap-2.5 text-[13px] font-medium mb-3 disabled:opacity-60 hover:bg-[rgb(var(--eleva-muted))]"
            style={{ background: 'rgb(var(--eleva-card))', border: '1px solid rgb(var(--eleva-border))', color: 'rgb(var(--eleva-fg))' }}
            data-testid="google-sign-in"
          >
            <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.9 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.9c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.4-4.1 6.8-10.1 6.8-17.6z"/><path fill="#FBBC05" d="M10.5 28.7a14.4 14.4 0 0 1 0-9.4L2.6 13.2A24 24 0 0 0 0 24c0 3.9.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.7l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-2 my-4">
            <div className="flex-1 h-px" style={{ background: 'rgb(var(--eleva-border))' }} />
            <span className="text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>OR</span>
            <div className="flex-1 h-px" style={{ background: 'rgb(var(--eleva-border))' }} />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <div className="relative">
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" required className="w-full h-10 px-3 rounded-lg text-sm outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} data-testid="signup-name"/>
              </div>
            )}
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" required className="w-full h-10 pl-9 pr-3 rounded-lg text-sm outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} data-testid="auth-email"/>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" required minLength={6} className="w-full h-10 pl-9 pr-3 rounded-lg text-sm outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} data-testid="auth-password"/>
            </div>
            {err && (
              <div className="flex items-start gap-2 text-[12px] p-2.5 rounded-lg" style={{ background: 'rgba(239,68,68,.08)', color: 'rgb(var(--eleva-danger))' }}>
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {err}
              </div>
            )}
            <button type="submit" disabled={busy} className="w-full h-10 rounded-lg font-medium text-white inline-flex items-center justify-center gap-2 disabled:opacity-70" style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }} data-testid="auth-submit">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{mode === 'signup' ? 'Create account' : 'Sign in'} <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-6 text-center text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            {mode === 'signup' ? (
              <>Already have an account? <Link href="/eleva/login" className="font-medium" style={{ color: 'rgb(var(--eleva-primary))' }}>Sign in</Link></>
            ) : (
              <>New to Eleva? <Link href="/eleva/signup" className="font-medium" style={{ color: 'rgb(var(--eleva-primary))' }}>Create an account</Link></>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { ElevaLogo } from '../_components/eleva-logo';
import { getSafeNextPath } from '../_lib/auth-redirect';
import { Loader2, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

const supabase = () => createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

function getCallbackError(param: string | null): string | null {
  if (!param) return null;
  if (param === 'oauth' || param === 'oauth_failed' || param === 'oauth_callback') {
    return 'Google sign-in failed. Please try again.';
  }
  if (param === 'email_confirmation') {
    return 'Email confirmation failed or the link has expired. Please try again.';
  }
  if (param === 'missing_code' || param === 'missing_callback_code') {
    return 'Sign-in link is invalid or expired. Please try again.';
  }
  return null;
}

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(() => getCallbackError(params.get('err') ?? params.get('error')));
  const next = getSafeNextPath(params.get('next'));

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
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      if (msg.includes('Invalid login credentials')) {
        setErr('Incorrect email or password.');
      } else if (msg.includes('Email not confirmed')) {
        setErr('Please confirm your email address before signing in.');
      } else if (msg.includes('rate_limit')) {
        setErr('Too many attempts. Please try again later.');
      } else {
        setErr(msg);
      }
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

  const isLogin = mode === 'login';
  const heading = isLogin ? 'Welcome back' : 'Create your account';
  const subtext = isLogin ? 'Sign in to your Eleva workspace.' : 'Start building a more organized job search.';
  const cta = isLogin ? 'Sign in' : 'Create account';
  const ctaLoading = isLogin ? 'Signing in\u2026' : 'Creating account\u2026';

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: 'rgb(var(--eleva-bg))' }}>
      <div
        className="hidden lg:flex flex-1 items-center justify-center p-10 relative"
        style={{
          background:
            'radial-gradient(circle at 20% 15%, rgba(37,99,235,0.10), transparent 40%), radial-gradient(circle at 85% 80%, rgba(124,58,237,0.07), transparent 40%), linear-gradient(180deg, #EFF6FF 0%, #EEF2FF 100%)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden>
          <div className="eleva-orbit-drift absolute" style={{ left: '-8%', top: '12%', width: 520, height: 520 }}>
            <div className="eleva-orbit-ring" style={{ width: 320, height: 320, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
            <div className="eleva-orbit-ring" style={{ width: 460, height: 460, left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }} />
            <div className="eleva-orbit-node" style={{ width: 8, height: 8, left: '50%', top: '4%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#2563EB,#7C3AED)', boxShadow: '0 0 12px rgba(79,70,229,.5)' }} />
            <div className="eleva-orbit-node" style={{ width: 5, height: 5, left: '12%', top: '55%', background: '#93C5FD' }} />
            <div className="eleva-orbit-node" style={{ width: 5, height: 5, right: '10%', top: '35%', background: '#C4B5FD' }} />
          </div>
        </div>
        <div className="relative max-w-[484px] w-full">
          <div className="mb-5">
            <ElevaLogo size={24} />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[12px] font-medium mt-6" style={{ border: '1px solid rgba(37,99,235,0.18)', background: 'rgba(37,99,235,0.05)', color: 'rgb(var(--eleva-primary))' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgb(var(--eleva-success))' }} />
              AI Career Operating System
            </div>
            <h2 className="font-display font-bold tracking-tight mt-4 leading-[1.05]" style={{ fontSize: 'clamp(2.5rem, 3.2vw, 3.25rem)', color: 'rgb(var(--eleva-fg))' }}>
              Your job search,<br />organized.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              One workspace to tailor resumes, analyze ATS fit, and manage applications.
            </p>
          </div>
          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-x-8 -top-8 -bottom-8 pointer-events-none"
              style={{ background: 'radial-gradient(ellipse at 50% 40%, rgba(37,99,235,0.07), transparent 70%)' }}
            />
            <div
              className="relative rounded-2xl overflow-hidden border"
              style={{
                borderColor: 'rgba(148,163,184,0.3)',
                background: 'rgb(var(--eleva-card))',
                boxShadow: '0 24px 70px -18px rgba(15,23,42,0.16)',
              }}
            >
            <div className="h-8 border-b flex items-center gap-1.5 px-3" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
              <div className="w-2 h-2 rounded-full" style={{ background: '#f87171' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: '#fbbf24' }} />
              <div className="w-2 h-2 rounded-full" style={{ background: '#34d399' }} />
              <span className="ml-2 text-[9px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>eleva.app/workspace</span>
            </div>
            <div className="flex">
              <div className="hidden sm:block border-r p-3 w-[130px]" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
                <div className="text-[8px] font-mono uppercase tracking-widest px-2 mb-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Workspace</div>
                {['Overview', 'Studio', 'Resumes', 'ATS Match', 'Cover Letters', 'Applications', 'Analytics'].map((n, i) => (
                  <div
                    key={n}
                    className="flex items-center gap-1.5 h-6 px-2 rounded-md text-[10px] font-medium"
                    style={{
                      background: i === 3 ? 'rgba(37,99,235,0.08)' : 'transparent',
                      color: i === 3 ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-muted-fg))',
                    }}
                  >
                    <span className="w-1 h-1 rounded-full shrink-0" style={{ background: i === 3 ? 'rgb(var(--eleva-primary))' : 'transparent' }} />
                    {n}
                  </div>
                ))}
              </div>
              <div className="p-4 flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-semibold text-white" style={{ background: 'linear-gradient(135deg,#2563EB,#4F46E5)' }}>
                    AM
                  </div>
                  <div>
                    <div className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>Senior Backend Engineer</div>
                    <div className="text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Northwind Labs</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div className="text-[18px] font-semibold font-display" style={{ color: 'rgb(var(--eleva-success))' }}>91%</div>
                    <div className="text-[9px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>ATS Match</div>
                  </div>
                </div>
                <div className="space-y-2 mb-3">
                  {[
                    { label: 'Keyword alignment', v: 94 },
                    { label: 'Experience relevance', v: 89 },
                    { label: 'Formatting', v: 100 },
                    { label: 'Skills matched', v: 87 },
                  ].map((m) => (
                    <div key={m.label}>
                      <div className="flex justify-between text-[9px] mb-0.5">
                        <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{m.label}</span>
                        <span className="font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{m.v}%</span>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
                        <div className="h-full rounded-full" style={{ width: `${m.v}%`, background: 'linear-gradient(90deg,#2563EB,#4F46E5)' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-3 border-t space-y-1" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
                  <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: 'rgb(var(--eleva-success))' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    7 bullets improved
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: 'rgb(var(--eleva-success))' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    12 keywords aligned
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[448px]"
        >
          <div className="lg:hidden mb-8">
            <ElevaLogo size={22} />
          </div>
          <div
            className="rounded-[18px] px-8 py-9"
            style={{
              background: 'rgba(255,255,255,0.94)',
              border: '1px solid rgba(148,163,184,0.22)',
              boxShadow: '0 24px 70px rgba(15,23,42,0.08)',
            }}
          >
            <h1 className="font-display text-xl font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>
              {heading}
            </h1>
            <p className="mt-1 text-[13px] mb-6" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              {subtext}
            </p>

            <button
              onClick={google}
              disabled={busy}
              className="w-full h-12 rounded-xl flex items-center justify-center gap-2.5 text-[13px] font-medium disabled:opacity-50 transition-colors"
              style={{ background: 'rgb(var(--eleva-card))', border: '1px solid rgb(var(--eleva-border))', color: 'rgb(var(--eleva-fg))' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgb(var(--eleva-muted))'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgb(var(--eleva-card))'}
              data-testid="google-sign-in"
            >
              <svg width="16" height="16" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.9 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.9c-.6 3-2.3 5.5-4.9 7.2l7.6 5.9c4.4-4.1 6.8-10.1 6.8-17.6z"/><path fill="#FBBC05" d="M10.5 28.7a14.4 14.4 0 0 1 0-9.4L2.6 13.2A24 24 0 0 0 0 24c0 3.9.9 7.6 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.8 2.3-8.3 2.3-6.3 0-11.6-4.1-13.5-9.7l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>
              Continue with Google
            </button>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ background: 'rgb(var(--eleva-border))' }} />
              <span className="text-[10px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>or</span>
              <div className="flex-1 h-px" style={{ background: 'rgb(var(--eleva-border))' }} />
            </div>

            <form onSubmit={submit} className="space-y-4">
              {!isLogin && (
                <div>
                  <label htmlFor="auth-firstname" className="text-[12px] font-medium mb-1.5 block" style={{ color: 'rgb(var(--eleva-fg))' }}>Name</label>
                  <input
                    id="auth-firstname"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Your name"
                    required
                    className={`eleva-input ${err ? 'eleva-input-error' : ''}`}
                    data-testid="signup-name"
                  />
                </div>
              )}
              <div>
                <label htmlFor="auth-email" className="text-[12px] font-medium mb-1.5 block" style={{ color: 'rgb(var(--eleva-fg))' }}>Email</label>
                <input
                  id="auth-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className={`eleva-input ${err ? 'eleva-input-error' : ''}`}
                  data-testid="auth-email"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="auth-password" className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>Password</label>
                  {isLogin && (
                    <Link href="/eleva/auth/reset-password" className="text-[11px] font-medium transition-colors" style={{ color: 'rgb(var(--eleva-primary))' }}>
                      Forgot password?
                    </Link>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPw ? 'text' : 'password'}
                    placeholder={isLogin ? 'Your password' : 'Create a password'}
                    required
                    minLength={6}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    className={`eleva-input ${err ? 'eleva-input-error' : ''}`}
                    style={{ paddingRight: 44 }}
                    data-testid="auth-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'rgb(var(--eleva-muted-fg))' }}
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                data-testid="auth-submit"
              >
                {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> {ctaLoading}</> : <>{cta} <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>

            <div className="mt-6 text-center text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              {isLogin ? (
                <>New to Eleva? <Link href="/eleva/auth/signup" className="font-medium transition-colors" style={{ color: 'rgb(var(--eleva-primary))' }}>Create an account</Link></>
              ) : (
                <>Already have an account? <Link href="/eleva/auth/login" className="font-medium transition-colors" style={{ color: 'rgb(var(--eleva-primary))' }}>Sign in</Link></>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

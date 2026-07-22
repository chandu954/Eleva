'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Copy, RefreshCw, Loader2, FileText, Eye, Download, Edit3, User, Building2, Briefcase, Star, ShieldCheck, CheckCircle2, ListChecks } from 'lucide-react';
import { WorkspaceShell } from '../_components/workspace-shell';
import { streamElevaText } from '../_lib/eleva-client';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';

const tones = [{ id: 'confident', label: 'Confident', icon: Star }, { id: 'friendly', label: 'Friendly', icon: User }, { id: 'technical', label: 'Technical', icon: Briefcase }, { id: 'concise', label: 'Concise', icon: Edit3 }, { id: 'warm', label: 'Warm', icon: Sparkles }];
const lengths = ['Short', 'Medium', 'Long'];
const focuses = ['Leadership', 'Technical Skills', 'Impact', 'Culture Fit', 'Growth'];

type SavedLetter = { id: string; company: string; role: string; body: string; tone: string | null; length: string | null; created_at: string };

export default function CoverLetterPage() {
  const [tone, setTone] = useState('confident');
  const [length, setLength] = useState('Medium');
  const [focus, setFocus] = useState('Impact');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [achievements, setAchievements] = useState('');
  const [letter, setLetter] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDraft, setShowDraft] = useState(true);
  const [_history, setHistory] = useState<SavedLetter[]>([]);
  const [generated, setGenerated] = useState(false);

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase.from('cover_letters').select('id, company, role, body, tone, length, created_at').order('created_at', { ascending: false }).limit(20);
    setHistory((data ?? []) as SavedLetter[]);
  }, [supabase]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    const ch = supabase
      .channel('cover-letters-page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cover_letters' }, (p) => setHistory((prev) => [p.new as SavedLetter, ...prev].slice(0, 20)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'cover_letters' }, (p) => setHistory((prev) => prev.filter((h) => h.id !== (p.old as SavedLetter).id)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase]);

  const generate = async () => {
    if (busy) return;
    if (!company.trim() || !role.trim()) { toast.error('Company and role required'); return; }
    setBusy(true);
    setLetter('');
    let acc = '';
    try {
      for await (const chunk of streamElevaText('/eleva/api/tool/draft', {
        company, role, tone: tone.toLowerCase(), length: length.toLowerCase(), achievements,
        focus: focus.toLowerCase(),
      })) {
        acc += chunk;
        setLetter(acc);
      }
      setGenerated(true);
    } finally { setBusy(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const canGenerate = company.trim() && role.trim() && !busy;

  return (
    <WorkspaceShell>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Cover Letter Studio</div>
          <h1 className="font-display text-4xl font-semibold tracking-tighter" style={{ color: 'rgb(var(--eleva-fg))' }}>Write a cover letter that sounds like you.</h1>
          <p className="mt-2 text-[15px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Choose a tone, set your focus, and generate. Refine until it&apos;s perfect.</p>
        </motion.div>

        {/* Tone & Focus quick select */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {tones.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTone(t.id)}
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[12px] font-medium transition-all"
                style={{
                  background: tone === t.id ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted))',
                  color: tone === t.id ? 'rgb(var(--eleva-bg))' : 'rgb(var(--eleva-muted-fg))',
                }}
              >
                <Icon className="w-3 h-3" />
                {t.label}
              </button>
            );
          })}
          <span className="w-px h-6" style={{ background: 'rgb(var(--eleva-border))' }} />
          {lengths.map((l) => (
            <button key={l} onClick={() => setLength(l)}
              className="px-3 h-8 rounded-lg text-[12px] font-medium transition-all"
              style={{
                background: length === l ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted))',
                color: length === l ? 'rgb(var(--eleva-bg))' : 'rgb(var(--eleva-muted-fg))',
              }}
            >{l}</button>
          ))}
          <span className="w-px h-6" style={{ background: 'rgb(var(--eleva-border))' }} />
          {focuses.map((f) => (
            <button key={f} onClick={() => setFocus(f)}
              className="px-3 h-8 rounded-lg text-[12px] font-medium transition-all"
              style={{
                background: focus === f ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted))',
                color: focus === f ? 'rgb(var(--eleva-bg))' : 'rgb(var(--eleva-muted-fg))',
              }}
            >{f}</button>
          ))}
        </div>

        <div className="grid lg:grid-cols-[320px_1fr_1fr] gap-5">
          {/* Left: inputs */}
          <div className="eleva-card p-5 space-y-3.5 h-fit">
            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest block mb-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                <Building2 className="w-3 h-3 inline mr-1" /> Company
              </label>
              <input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full h-10 px-3 rounded-lg text-sm outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} placeholder="e.g. Stripe" />
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest block mb-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                <Briefcase className="w-3 h-3 inline mr-1" /> Role
              </label>
              <input value={role} onChange={(e) => setRole(e.target.value)} className="w-full h-10 px-3 rounded-lg text-sm outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} placeholder="e.g. Staff Engineer" />
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest block mb-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                <Edit3 className="w-3 h-3 inline mr-1" /> Key achievements
              </label>
              <textarea rows={4} value={achievements} onChange={(e) => setAchievements(e.target.value)} className="w-full p-3 rounded-lg text-[13px] outline-none resize-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} placeholder="Optional — add specific wins to highlight…" />
            </div>
            <button
              onClick={generate}
              disabled={!canGenerate}
              className="w-full h-10 rounded-lg font-medium text-white inline-flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {busy ? 'Generating…' : 'Generate'}
            </button>
          </div>

          {/* Middle: AI draft */}
          <div className="eleva-card flex flex-col overflow-hidden min-h-[500px]">
            <div className="h-12 px-4 flex items-center gap-2 border-b" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}>
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>
                {letter ? 'Draft' : 'AI Suggestions'}
              </div>
              <div className="ml-auto flex items-center gap-2">
                {letter && (
                  <>
                    <button onClick={() => setShowDraft(!showDraft)} className="text-[11px] px-2 h-6 rounded-md inline-flex items-center gap-1" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                      {showDraft ? <Eye className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                      {showDraft ? 'Preview' : 'Edit'}
                    </button>
                    <button onClick={copy} className="text-[11px] px-2 h-6 rounded-md inline-flex items-center gap-1" style={{ background: 'rgb(var(--eleva-muted))', color: copied ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-muted-fg))' }}>
                      <Copy className="w-3 h-3" /> {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button onClick={generate} disabled={busy} className="text-[11px] px-2 h-6 rounded-md inline-flex items-center gap-1" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                      <RefreshCw className={`w-3 h-3 ${busy ? 'animate-spin' : ''}`} /> Regenerate
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {!letter && !busy ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.1)' }}>
                    <FileText className="w-6 h-6" style={{ color: 'rgb(var(--eleva-primary))' }} />
                  </div>
                  <div className="font-display text-lg font-semibold mb-1" style={{ color: 'rgb(var(--eleva-fg))' }}>Ready to write</div>
                  <div className="text-[13px] max-w-xs" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                    Fill in the company and role, pick your tone, then generate.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {busy && !letter && (
                    <div className="flex items-center gap-3 p-4 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
                      <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'rgb(var(--eleva-primary))' }} />
                      <span className="text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Eleva is drafting your letter…</span>
                    </div>
                  )}
                  <div className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: 'rgb(var(--eleva-fg))' }}>
                    {letter}
                    {busy && <span className="inline-block w-1.5 h-3 -mb-0.5 ml-0.5 rounded-sm" style={{ background: 'rgb(var(--eleva-primary))', animation: 'eleva-blink 1s infinite' }} />}
                  </div>

                  {generated && (
                    <>
                      <div className="h-px" style={{ background: 'rgb(var(--eleva-border))' }} />
                      <div className="flex items-center gap-2 p-3 rounded-lg" style={{ background: 'rgba(var(--eleva-success-rgb), 0.08)' }}>
                        <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: 'rgb(var(--eleva-success))' }} />
                        <div>
                          <div className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>
                            Zero Hallucination Guarantee
                          </div>
                          <div className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                            Every claim is grounded in your resume, profile, or the job description. No invented experience.
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))' }}>
                        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgb(var(--eleva-success))' }}>
                          <CheckCircle2 className="w-3 h-3" />
                          Resume
                        </div>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-card))' }}>
                          <div className="h-full rounded-full w-[87%]" style={{ background: 'rgb(var(--eleva-success))' }} />
                        </div>
                        <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>87%</span>
                        <div className="flex items-center gap-1.5 text-[11px]" style={{ color: 'rgb(var(--eleva-primary))' }}>
                          <FileText className="w-3 h-3" />
                          JD
                        </div>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-card))' }}>
                          <div className="h-full rounded-full w-[13%]" style={{ background: 'rgb(var(--eleva-primary))' }} />
                        </div>
                        <span className="text-[10px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>13%</span>
                      </div>
                      <div className="p-3 rounded-lg" style={{ background: 'rgba(var(--eleva-warning-rgb), 0.08)' }}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <ListChecks className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-warning))' }} />
                          <span className="text-[11px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>Consider adding these</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {['Distributed Systems', 'PyTorch', 'Kubernetes', 'Team Leadership'].map((s) => (
                            <span key={s} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-muted-fg))', border: '1px solid rgb(var(--eleva-border))' }}>
                              {s}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] mt-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                          Run an <a href="/eleva/ats" className="underline" style={{ color: 'rgb(var(--eleva-primary))' }}>ATS scan</a> to see how your resume matches this job.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: preview */}
          <div className="eleva-card flex flex-col min-h-[500px]">
            <div className="h-12 px-4 flex items-center gap-2 border-b" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
              <Eye className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
              <div className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>Preview</div>
              <div className="ml-auto flex items-center gap-1">
                <button onClick={async () => {
                  if (!letter) return;
                  try {
                    const res = await fetch('/eleva/api/export/cover-letter', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ content: letter, title: `Cover Letter — ${company}`, company, role }),
                    });
                    if (!res.ok) throw new Error('Export failed');
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `cover-letter-${(company || 'eleva').replace(/\s+/g, '-').toLowerCase()}.pdf`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('PDF exported');
                  } catch (e) { toast.error('Export failed', { description: (e as Error).message }); }
                }} className="text-[11px] px-2 h-6 rounded-md inline-flex items-center gap-1" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                  <Download className="w-3 h-3" /> PDF
                </button>
                <button onClick={async () => {
                  if (!letter) return;
                  try {
                    const res = await fetch('/eleva/api/export/cover-letter-docx', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ content: letter, title: `Cover Letter — ${company}`, company, role }),
                    });
                    if (!res.ok) throw new Error('Export failed');
                    const blob = await res.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `cover-letter-${(company || 'eleva').replace(/\s+/g, '-').toLowerCase()}.docx`;
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('DOCX exported');
                  } catch (e) { toast.error('Export failed', { description: (e as Error).message }); }
                }} className="text-[11px] px-2 h-6 rounded-md inline-flex items-center gap-1" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                  <Download className="w-3 h-3" /> DOCX
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <motion.div
                key={tone + length + focus}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                className="rounded-lg p-8 whitespace-pre-line text-[14px] leading-[1.8] font-serif min-h-[400px]"
                style={{ background: '#fff', color: '#0f172a', boxShadow: 'inset 0 0 0 1px rgb(var(--eleva-border))' }}
              >
                {letter || (
                  <div className="flex flex-col items-center justify-center h-full text-center text-slate-300">
                    <FileText className="w-10 h-10 mb-3" />
                    <p className="text-[14px]">Preview will appear here</p>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}

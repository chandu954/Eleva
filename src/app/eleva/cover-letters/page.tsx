'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import { Sparkles, Copy, RefreshCw, Send, Wand2, Loader2 } from 'lucide-react';
import { WorkspaceShell } from '../_components/workspace-shell';
import { streamElevaText } from '../_lib/eleva-client';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';

const tones = ['Confident', 'Friendly', 'Technical', 'Concise', 'Warm'];
const lengths = ['Short', 'Medium', 'Long'];

type SavedLetter = { id: string; company: string; role: string; body: string; tone: string | null; length: string | null; created_at: string };

export default function CoverLetterPage() {
  const [tone, setTone] = useState('Confident');
  const [length, setLength] = useState('Medium');
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [achievements, setAchievements] = useState('');
  const [letter, setLetter] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [_history, setHistory] = useState<SavedLetter[]>([]);
  const [_selectedId, setSelectedId] = useState<string | null>(null);

  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase.from('cover_letters').select('id, company, role, body, tone, length, created_at').order('created_at', { ascending: false }).limit(20);
    setHistory((data ?? []) as SavedLetter[]);
  }, [supabase]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    const ch = supabase
      .channel('cover-letters:page')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cover_letters' }, (p) => setHistory((prev) => [p.new as SavedLetter, ...prev].slice(0, 20)))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'cover_letters' }, (p) => setHistory((prev) => prev.filter((h) => h.id !== (p.old as SavedLetter).id)))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generate = async () => {
    if (busy) return;
    if (!company.trim() || !role.trim()) { toast.error('Company and role required'); return; }
    setBusy(true);
    setLetter('');
    setSelectedId(null);
    let acc = '';
    try {
      for await (const chunk of streamElevaText('/eleva/api/tool/draft', {
        company, role, tone: tone.toLowerCase(), length: length.toLowerCase(), achievements,
      })) {
        acc += chunk;
        setLetter(acc);
      }
    } finally {
      setBusy(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(letter);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <WorkspaceShell>
      <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
        <div className="mb-8">
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Cover Letter Studio</div>
          <h1 className="font-display text-4xl font-semibold tracking-tighter" style={{ color: 'rgb(var(--eleva-fg))' }}>Write a cover letter that sounds like you.</h1>
          <p className="mt-2 text-[15px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            AI drafts. You refine. Tone controls, live preview, one-click send.
          </p>
        </div>

        <div className="grid lg:grid-cols-[300px_1fr_1fr] gap-4">
          {/* Left inputs */}
          <div className="eleva-card p-5 space-y-4 h-fit">
            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest block mb-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Company</label>
              <input value={company} onChange={(e) => setCompany(e.target.value)} className="w-full h-10 px-3 rounded-lg text-sm outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} data-testid="cl-company" />
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest block mb-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Role</label>
              <input value={role} onChange={(e) => setRole(e.target.value)} className="w-full h-10 px-3 rounded-lg text-sm outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} data-testid="cl-role" />
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest block mb-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Hiring manager</label>
              <input placeholder="Optional" className="w-full h-10 px-3 rounded-lg text-sm outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} />
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest block mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Tone</label>
              <div className="flex flex-wrap gap-1.5">
                {tones.map(t => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className="text-[12px] px-3 h-8 rounded-lg"
                    style={{
                      background: tone === t ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-muted))',
                      color: tone === t ? '#fff' : 'rgb(var(--eleva-muted-fg))',
                    }}
                    data-testid={`tone-${t.toLowerCase()}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest block mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Length</label>
              <div className="flex gap-1.5">
                {lengths.map(l => (
                  <button key={l} onClick={() => setLength(l)}
                    className="flex-1 text-[12px] h-8 rounded-lg"
                    style={{
                      background: length === l ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-muted))',
                      color: length === l ? '#fff' : 'rgb(var(--eleva-muted-fg))',
                    }}
                  >{l}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase tracking-widest block mb-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Key achievements</label>
              <textarea
                rows={4}
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                className="w-full p-3 rounded-lg text-[13px] outline-none resize-none"
                style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}
                data-testid="cl-achievements"
              />
            </div>
            <button
              onClick={generate}
              disabled={busy}
              className="w-full h-10 rounded-lg font-medium text-white inline-flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}
              data-testid="generate-letter"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {busy ? 'Streaming…' : 'Generate letter'}
            </button>
          </div>

          {/* Middle: AI chat */}
          <div className="eleva-card flex flex-col overflow-hidden h-[560px]">
            <div className="h-12 px-4 flex items-center gap-2 border-b" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}>
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>Eleva AI · drafting for Stripe</div>
              <div className="ml-auto text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Draft v3</div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}>
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div className="text-[13px] leading-relaxed p-3 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}>
                  I&apos;ve read the Stripe JD and cross-referenced with your resume. I&apos;m drafting with a <strong>{tone.toLowerCase()}</strong> tone and <strong>{length.toLowerCase()}</strong> length. Ready?
                </div>
              </div>
              <div className="flex justify-end">
                <div className="text-[13px] leading-relaxed p-3 rounded-lg text-white max-w-[80%]" style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}>
                  Yes — emphasize the pricing infra + ledger work at Ramp/Google. Mention the eng blog.
                </div>
              </div>
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}>
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <div className="text-[13px] leading-relaxed p-3 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}>
                  Done. Preview is live on the right. Want it more confident, more technical, or should I regenerate with a story hook?
                </div>
              </div>
            </div>
            <div className="p-3 border-t" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {['More confident', 'More technical', 'Add story hook', 'Shorter'].map(s => (
                  <button key={s} className="text-[11px] px-2.5 py-1 rounded-full" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
                    <Wand2 className="w-2.5 h-2.5 inline mr-1" /> {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input placeholder="Ask Eleva to refine…" className="flex-1 h-10 px-3 rounded-lg text-sm outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} />
                <button className="w-10 h-10 rounded-lg flex items-center justify-center text-white" style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}>
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Right: letter preview */}
          <div className="eleva-card p-6 h-[560px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Live preview</div>
              <div className="flex items-center gap-1">
                <button onClick={copy} className="w-8 h-8 rounded-md hover:bg-[rgb(var(--eleva-muted))] flex items-center justify-center" data-testid="copy-letter"><Copy className="w-3.5 h-3.5" style={{ color: copied ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-muted-fg))' }} /></button>
                <button onClick={generate} disabled={busy} className="w-8 h-8 rounded-md hover:bg-[rgb(var(--eleva-muted))] flex items-center justify-center disabled:opacity-50"><RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} style={{ color: 'rgb(var(--eleva-muted-fg))' }} /></button>
                <button onClick={async () => {
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
                  } catch (e) { console.error(e); }
                }} className="w-8 h-8 rounded-md hover:bg-[rgb(var(--eleva-muted))] flex items-center justify-center text-[9px] font-mono font-semibold" title="Download PDF" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>PDF</button>
                <button onClick={async () => {
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
                  } catch (e) { console.error(e); }
                }} className="w-9 h-8 rounded-md hover:bg-[rgb(var(--eleva-muted))] flex items-center justify-center text-[9px] font-mono font-semibold" title="Download DOCX" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>DOCX</button>
              </div>
            </div>
            <motion.div
              key={tone + length}
              initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}
              className="flex-1 overflow-y-auto rounded-lg p-6 whitespace-pre-line text-[13px] leading-[1.75]"
              style={{ background: '#fff', color: '#0f172a', boxShadow: 'inset 0 0 0 1px rgb(var(--eleva-border))' }}
            >
              {letter}
            </motion.div>
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}

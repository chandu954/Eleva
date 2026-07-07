'use client';

import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Loader2, FileText, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { createBrowserClient } from '@supabase/ssr';
import pdfToText from 'react-pdftotext';

type Step = 'idle' | 'reading' | 'uploading' | 'extracting' | 'done' | 'error';

export function ResumeUploader({ onImported }: { onImported?: (resumeId: string) => void }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [setAsBase, setSetAsBase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function run(f: File) {
    setFile(f);
    setStep('reading');
    setError(null);
    try {
      const text = await pdfToText(f);
      if (!text || text.length < 50) throw new Error('Could not extract text — PDF may be scanned/image-only.');
      setPreview(text.slice(0, 800));

      // Upload PDF to Supabase Storage (private bucket)
      setStep('uploading');
      const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) throw new Error('Not signed in');
      const path = `${userRes.user.id}/${Date.now()}-${f.name.replace(/[^a-z0-9.-]+/gi, '_')}`;
      const { error: upErr } = await supabase.storage.from('resumes').upload(path, f, { upsert: false, contentType: f.type });
      if (upErr) throw upErr;

      // Call AI-fill endpoint
      setStep('extracting');
      const res = await fetch('/eleva/api/resumes/import', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, fileName: f.name, storagePath: path, setAsBase }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Import failed');
      setStep('done');
      toast.success('Resume imported', { description: `${j.resume.name} — open the editor to review.` });
      onImported?.(j.resume.id);
      setTimeout(() => { setOpen(false); setStep('idle'); setFile(null); setPreview(''); }, 1500);
    } catch (e) {
      const msg = (e as Error).message ?? 'Failed';
      setError(msg);
      setStep('error');
      toast.error('Import failed', { description: msg });
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="eleva-btn-ghost inline-flex items-center gap-2 text-[13px]" data-testid="upload-resume">
        <Upload className="w-4 h-4" />Upload PDF
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={() => step === 'idle' && setOpen(false)}>
            <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--eleva-card))', border: '1px solid rgb(var(--eleva-border))' }}>
              <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
                <div>
                  <div className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Import</div>
                  <div className="font-display text-lg font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Upload a resume</div>
                </div>
                {step === 'idle' && <button onClick={() => setOpen(false)} className="p-2"><X className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} /></button>}
              </div>

              <div className="p-5">
                {step === 'idle' && (
                  <>
                    <div onClick={() => inputRef.current?.click()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) run(e.dataTransfer.files[0]); }} onDragOver={(e) => e.preventDefault()} className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
                      <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
                      <div className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>Drop your PDF here, or click to browse</div>
                      <div className="text-[11px] mt-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Any resume format. We&apos;ll extract every field with AI.</div>
                      <input ref={inputRef} type="file" accept="application/pdf,.pdf" onChange={(e) => { const f = e.target.files?.[0]; if (f) run(f); }} className="hidden" />
                    </div>
                    <label className="flex items-center gap-2 mt-4 text-[12px] cursor-pointer" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      <input type="checkbox" checked={setAsBase} onChange={(e) => setSetAsBase(e.target.checked)} />
                      Set as base resume (Studio will use it by default)
                    </label>
                  </>
                )}

                {step !== 'idle' && (
                  <div className="space-y-4">
                    <StepRow label="Extract text from PDF"    active={step === 'reading'}    done={['uploading','extracting','done'].includes(step)} />
                    <StepRow label="Upload to Supabase Storage" active={step === 'uploading'} done={['extracting','done'].includes(step)} />
                    <StepRow label="AI-fill resume fields"    active={step === 'extracting'} done={step === 'done'} />
                    {file && (
                      <div className="p-3 rounded-lg text-[12px]" style={{ background: 'rgb(var(--eleva-muted))' }}>
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
                          <span className="font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{file.name}</span>
                          <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>({Math.round(file.size / 1024)}KB)</span>
                        </div>
                        {preview && <div className="text-[10px] leading-relaxed font-mono line-clamp-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{preview}…</div>}
                      </div>
                    )}
                    {step === 'error' && <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-warning))' }}>Error: {error}</div>}
                    {step === 'done' && <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-success))' }}>Imported! Opening resumes list…</div>}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function StepRow({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: done ? 'rgb(var(--eleva-success))' : active ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-muted))', color: done || active ? '#fff' : 'rgb(var(--eleva-muted-fg))' }}>
        {active ? <Loader2 className="w-3 h-3 animate-spin" /> : done ? <Check className="w-3 h-3" /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
      </div>
      <div className="text-[13px]" style={{ color: done || active ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))' }}>{label}</div>
    </div>
  );
}

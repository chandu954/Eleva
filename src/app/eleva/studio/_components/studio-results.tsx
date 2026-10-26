'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Target, Mail, FileText, CheckCircle2, Loader2, Copy, ArrowRight, Download, BarChart3, AlertTriangle, Lightbulb, TrendingUp, TrendingDown, GitCompare, Star, Plus, Check } from 'lucide-react';
import type { StepState, StudioPipelineSummary } from '../_lib/use-studio-pipeline';
import { CoverLetterTab } from './cover-letter-tab';
import { StudioChangesTab } from './studio-changes-tab';
import { TailoredResumePreview } from './tailored-resume-preview';
import type { ExtractedJobData, JobScore, TailoredResume } from '../_lib/studio-types';


interface StudioResultsProps {
  running: boolean;
  steps: StepState[];
  letter: string;
  summary: StudioPipelineSummary | null;
  elapsed: string | null;
  resumes: { id: string; name: string; target_role: string | null; is_base_resume: boolean }[];
  resumeId?: string;
  role?: string | null;
  company?: string | null;
  stepTimings: Record<string, number>;
  tailoredResume: TailoredResume | null;
  extractData: ExtractedJobData | null;
  scoreData: JobScore | null;
  rescoreData: JobScore | null;
  activeTab: string;
  setActiveTab: (value: string) => void;
  creatingApplication: 'wishlist' | 'applied' | null;
  createApplication: (status: 'wishlist' | 'applied') => void;
  downloadExport: (format: 'pdf' | 'docx') => void;
  run: () => void;
}

export function StudioResults({
  running,
  steps,
  letter,
  summary,
  elapsed,
  resumes,
  resumeId,
  role,
  company,
  stepTimings,
  tailoredResume,
  extractData,
  scoreData,
  rescoreData,
  activeTab,
  setActiveTab,
  creatingApplication,
  createApplication,
  downloadExport,
  run,
}: StudioResultsProps) {
  return (
        <div className="space-y-4">
          {/* AI Analysis — live results panel */}
          <div className="eleva-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={1.75} />
                <span className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-primary))' }}>AI Analysis</span>
              </div>
              {(role || company) && (
                <div className="text-right leading-tight">
                  {role && <div className="text-[13px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>{role}</div>}
                  {company && <div className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{company}</div>}
                </div>
              )}
            </div>

            {!running && steps.length === 0 && !summary && (
              <div className="text-center py-10">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.08)' }}>
                  <Target className="w-6 h-6" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={1.5} />
                </div>
                <div className="text-[14px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>Your match analysis will appear here</div>
                <p className="text-[12px] mt-1 max-w-xs mx-auto" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  Paste a job description and press Analyze Job to see how your resume compares.
                </p>
              </div>
            )}

            {(running || steps.length > 0 || summary) && (() => {
              const live = rescoreData || scoreData || null;
              const atsVal = live ? Number(live.overall ?? 0) : summary ? summary.overall : 0;
              const matchVal = live ? Number(live.keyword ?? 0) : summary ? summary.matched : 0;
              const fmtVal = live ? Number(live.formatting ?? 0) : 0;
              const matchedSkills: string[] = live?.matched ?? [];
              const missingSkills: string[] = live?.missing ?? [];
              return (
              <div className="space-y-4">
                {/* Score tiles */}
                {(scoreData || summary) && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: 'Match', value: matchVal, suffix: '%', color: 'rgb(var(--eleva-secondary))' },
                      { label: 'ATS', value: atsVal, suffix: '/100', color: 'rgb(var(--eleva-primary))' },
                      { label: 'Formatting', value: fmtVal, suffix: '%', color: 'rgb(var(--eleva-accent))' },
                    ].map((t) => (
                      <div key={t.label} className="p-3 rounded-xl text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)', border: '1px solid rgb(var(--eleva-border))' }}>
                        <div className="text-[9px] font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{t.label}</div>
                        <div className="font-display text-2xl md:text-3xl font-bold mt-1" style={{ color: t.color }}>{t.value}{t.suffix}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Matched skills */}
                {matchedSkills.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgb(var(--eleva-success))' }}>Matched Skills</div>
                    <div className="flex flex-wrap gap-1.5">
                      {matchedSkills.slice(0, 10).map((k) => (
                        <span key={k} className="px-2 py-1 rounded-lg text-[11px] font-mono" style={{ background: 'rgba(var(--eleva-success-rgb), 0.1)', color: 'rgb(var(--eleva-success))' }}>{k}</span>
                      ))}
                      {matchedSkills.length > 10 && (
                        <span className="px-2 py-1 rounded-lg text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>+{matchedSkills.length - 10}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Missing skills */}
                {missingSkills.length > 0 && (
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest mb-2" style={{ color: 'rgb(var(--eleva-warning))' }}>Missing Skills</div>
                    <div className="flex flex-wrap gap-1.5">
                      {missingSkills.slice(0, 10).map((k) => (
                        <span key={k} className="px-2 py-1 rounded-lg text-[11px] font-mono" style={{ background: 'rgba(var(--eleva-warning-rgb), 0.1)', color: 'rgb(var(--eleva-warning))' }}>{k}</span>
                      ))}
                      {missingSkills.length > 10 && (
                        <span className="px-2 py-1 rounded-lg text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>+{missingSkills.length - 10}</span>
                      )}
                    </div>
                    <div className="text-[11px] mt-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      {missingSkills.length} skills could improve this resume
                    </div>
                  </div>
                )}

                {/* Recommended changes */}
                {(summary || steps.some((s) => s.step === 'tailor' && s.status === 'done')) && (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.06)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <Lightbulb className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-warning))' }} />
                      <span className="text-[10px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Recommended Changes</span>
                    </div>
                    <div className="space-y-1">
                      {summary?.sectionsModified ? (
                        <div className="flex items-center gap-2 text-[11px]"><CheckCircle2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} /><span style={{ color: 'rgb(var(--eleva-fg))' }}>{summary.sectionsModified} sections rewritten</span></div>
                      ) : null}
                      {summary?.keywordsAdded ? (
                        <div className="flex items-center gap-2 text-[11px]"><CheckCircle2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} /><span style={{ color: 'rgb(var(--eleva-fg))' }}>{summary.keywordsAdded} keywords added</span></div>
                      ) : null}
                      {summary?.bulletsRewritten ? (
                        <div className="flex items-center gap-2 text-[11px]"><CheckCircle2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} /><span style={{ color: 'rgb(var(--eleva-fg))' }}>{summary.bulletsRewritten} bullets improved</span></div>
                      ) : null}
                      {!summary && <div className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Analyzing which changes would improve your match…</div>}
                    </div>
                  </div>
                )}

                {summary && !running && (
                  <div className="flex items-center justify-between pt-1">
                    <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      {summary.previousOverall !== undefined && summary.overall !== summary.previousOverall ? (
                        <><strong style={{ color: 'rgb(var(--eleva-success))' }}>{summary.previousOverall} → {summary.overall}</strong> ATS · improved by {summary.overall - summary.previousOverall}</>
                      ) : (
                        <strong style={{ color: 'rgb(var(--eleva-success))' }}>ATS {summary.overall}/100</strong>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href="/eleva/resumes" className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ border: '1px solid rgb(var(--eleva-border))' }}>
                        <FileText className="w-3 h-3" /> View Resume
                      </Link>
                      <Link href="/eleva/cover-letters" className="eleva-btn-primary text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg">
                        <Mail className="w-3 h-3" /> Cover Letter
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              );
            })()}
          </div>

          {!summary ? (
            <>
              {/* Cover letter streaming */}
              <AnimatePresence>
                {(letter || running) && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="eleva-card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(var(--eleva-success-rgb), 0.15)' }}>
                            <CheckCircle2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} />
                          </div>
                          <span className="text-[11px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Cover Letter</span>
                        </div>
                        {letter && <div className="font-display text-base font-semibold mt-0.5" style={{ color: 'rgb(var(--eleva-fg))' }}>{extractData?.company ?? 'Draft'} · {extractData?.role ?? '—'}</div>}
                      </div>
                      {letter && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => { navigator.clipboard.writeText(letter); toast.success('Copied'); }} className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1"><Copy className="w-3 h-3" /> Copy</button>
                          <button onClick={() => downloadExport('pdf')} className="eleva-btn-primary text-[11px] inline-flex items-center gap-1"><Download className="w-3 h-3" /> PDF</button>
                          <button onClick={() => downloadExport('docx')} className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1"><Download className="w-3 h-3" /> DOCX</button>
                        </div>
                      )}
                    </div>
                    <div className="text-[13px] leading-relaxed whitespace-pre-wrap font-serif min-h-[120px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
                      {letter}
                      {running && steps.find((s) => s.step === 'letter')?.status === 'running' && <span className="inline-block w-2 h-4 ml-0.5 align-middle animate-pulse" style={{ background: 'rgb(var(--eleva-primary))' }} />}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            /* ─── Application Ready + Tabbed Workspace ─── */
            <>
            {summary && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(var(--eleva-success-rgb), 0.08), rgba(var(--eleva-primary-rgb), 0.06))', border: '1px solid rgba(var(--eleva-success-rgb), 0.15)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5" style={{ color: 'rgb(var(--eleva-warning))' }} />
                    <div>
                      <div className="font-display text-lg font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Application Ready</div>
                      {role && <div className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{role}{company ? ` · ${company}` : ''}</div>}
                    </div>
                  </div>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, delay: 0.2 }} className="px-3 py-1 rounded-full text-[10px] font-mono font-semibold" style={{ background: 'rgba(var(--eleva-success-rgb), 0.15)', color: 'rgb(var(--eleva-success))' }}>
                    ★★★★★
                  </motion.div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="flex items-center justify-center gap-1">
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-2xl font-bold" style={{ color: summary.overall >= (summary.previousOverall ?? 0) ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-danger))' }}>{summary.overall}%</motion.span>
                      {summary.previousOverall !== undefined && (
                        <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] font-mono" style={{ color: summary.overall >= summary.previousOverall ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-danger))' }}>
                          <TrendingUp className="w-3 h-3 inline mr-0.5" />+{summary.overall - summary.previousOverall}
                        </motion.span>
                      )}
                    </div>
                    <div className="text-[9px] font-mono mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>ATS Score</div>
                    {summary.previousOverall !== undefined && (
                      <div className="text-[9px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{summary.previousOverall}% → {summary.overall}%</div>
                    )}
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="font-display text-2xl font-bold" style={{ color: 'rgb(var(--eleva-primary))' }}>{summary.keywordsAdded}</div>
                    <div className="text-[9px] font-mono mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Keywords Added</div>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="font-display text-2xl font-bold" style={{ color: 'rgb(var(--eleva-secondary))' }}>{summary.bulletsRewritten}</div>
                    <div className="text-[9px] font-mono mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Bullets Rewritten</div>
                  </div>
                  <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)', backdropFilter: 'blur(8px)' }}>
                    <div className="font-display text-2xl font-bold" style={{ color: 'rgb(var(--eleva-accent))' }}>{summary.matched}</div>
                    <div className="text-[9px] font-mono mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Keywords Matched</div>
                  </div>
                </div>

                {summary.isLowCompat && (
                  <div className="p-3 rounded-xl mb-3" style={{ background: 'rgba(var(--eleva-warning-rgb), 0.1)', border: '1px solid rgba(var(--eleva-warning-rgb), 0.2)' }}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'rgb(var(--eleva-warning))' }} />
                      <div>
                        <div className="text-[11px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Low Job Compatibility</div>
                        <div className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                          This role ({summary.role || 'unknown'}) differs significantly from your resume. The AI optimized wording and transferable skills but could not fabricate missing experience ({summary.compatibility}% match).
                        </div>
                        <div className="text-[10px] mt-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                          Recommendation: Create or select a resume with software engineering experience for best results.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 rounded-xl" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.06)' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Lightbulb className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-warning))' }} />
                    <span className="text-[10px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>AI Improvements</span>
                  </div>
                  <div className="space-y-1">
                    {summary.sectionsModified ? (
                      <div className="flex items-center gap-2 text-[11px]"><CheckCircle2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} /><span style={{ color: 'rgb(var(--eleva-fg))' }}>{summary.sectionsModified} sections rewritten</span></div>
                    ) : null}
                    {summary.keywordsAdded > 0 && <div className="flex items-center gap-2 text-[11px]"><CheckCircle2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} /><span style={{ color: 'rgb(var(--eleva-fg))' }}>Added {summary.keywordsAdded} missing keywords</span></div>}
                    {summary.bulletsRewritten > 0 && <div className="flex items-center gap-2 text-[11px]"><CheckCircle2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} /><span style={{ color: 'rgb(var(--eleva-fg))' }}>Rewrote {summary.bulletsRewritten} bullets</span></div>}
                    {summary.matched > 0 && <div className="flex items-center gap-2 text-[11px]"><CheckCircle2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} /><span style={{ color: 'rgb(var(--eleva-fg))' }}>{summary.matched} keywords matched</span></div>}
                    {summary.missing > 0 && <div className="flex items-center gap-2 text-[11px]"><AlertTriangle className="w-3 h-3" style={{ color: 'rgb(var(--eleva-warning))' }} /><span style={{ color: 'rgb(var(--eleva-fg))' }}>{summary.missing} keywords still missing</span></div>}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 gap-2 flex-wrap">
                  <Link href="/eleva/resumes" className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ border: '1px solid rgb(var(--eleva-border))' }}>
                    <FileText className="w-3 h-3" /> View Resume
                  </Link>
                  <div className="flex items-center gap-2">
                    <Link href={`/eleva/cover-letters?company=${encodeURIComponent(summary.company ?? '')}&role=${encodeURIComponent(summary.role ?? '')}`} className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg" style={{ border: '1px solid rgb(var(--eleva-border))' }}>
                      <Mail className="w-3 h-3" /> Cover Letter
                    </Link>
                    <button
                      onClick={() => createApplication('wishlist')}
                      disabled={!!creatingApplication}
                      className="eleva-btn-ghost text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg disabled:opacity-50"
                      style={{ border: '1px solid rgb(var(--eleva-border))' }}
                    >
                      {creatingApplication === 'wishlist' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />} Add to Applications
                    </button>
                    <button
                      onClick={() => createApplication('applied')}
                      disabled={!!creatingApplication}
                      className="eleva-btn-primary text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      {creatingApplication === 'applied' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Mark as Applied
                    </button>
                    <Link href="/eleva/ats" className="eleva-btn-primary text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded-lg">
                      <Target className="w-3 h-3" /> Open ATS
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Tabbed Workspace */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="eleva-card">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="px-5 pt-4 pb-0 border-b" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
                  <TabsList className="w-full justify-start gap-0 h-auto bg-transparent p-0">
                    {[
                      { value: 'resume', icon: FileText, label: 'Tailored Resume' },
                      { value: 'letter', icon: Mail, label: 'Cover Letter' },
                      { value: 'ats', icon: BarChart3, label: 'ATS Report' },
                      { value: 'changes', icon: GitCompare, label: 'AI Changes' },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.value;
                      return (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="relative px-4 py-2.5 text-[12px] font-medium rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-current"
                          style={{ color: isActive ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))', borderBottomColor: isActive ? 'rgb(var(--eleva-primary))' : 'transparent' }}
                        >
                          <Icon className="w-3.5 h-3.5 inline mr-1.5" />
                          {tab.label}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>

                {/* Tab: Tailored Resume */}
                <TailoredResumePreview
                  tailoredResume={tailoredResume}
                  extractData={extractData}
                  summary={summary}
                  resumes={resumes}
                  resumeId={resumeId}
                />

                <CoverLetterTab
                  letter={letter}
                  summary={summary}
                  elapsed={elapsed}
                  run={run}
                  downloadExport={downloadExport}
                />
                {/* Tab: ATS Report */}
                <TabsContent value="ats" className="mt-0 px-5 py-4">
                  {scoreData && rescoreData ? (
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="max-w-[650px] mx-auto space-y-6">
                        {/* Before/After */}
                        <div className="grid grid-cols-2 gap-4">
                          {(['overall', 'keyword', 'formatting', 'readability', 'impact', 'recruiter'] as const).map((metric) => {
                            const before = Number(scoreData[metric] ?? 0);
                            const after = Number(rescoreData[metric] ?? 0);
                            const diff = after - before;
                            const pct = before > 0 ? Math.round((after - before) / before * 100) : after > 0 ? 100 : 0;
                            return (
                              <div key={metric} className="p-4 rounded-xl" style={{ background: 'rgba(var(--eleva-card), 0.7)', backdropFilter: 'blur(8px)', border: '1px solid rgb(var(--eleva-border))' }}>
                                <div className="text-[10px] font-mono uppercase mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{metric.replace(/_/g, ' ')}</div>
                                <div className="flex items-baseline gap-2">
                                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display text-2xl font-bold" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{before}%</motion.span>
                                  <ArrowRight className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
                                  <motion.span initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="font-display text-2xl font-bold" style={{ color: diff >= 0 ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-danger))' }}>{after}%</motion.span>
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                  {diff >= 0 ? <TrendingUp className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} /> : <TrendingDown className="w-3 h-3" style={{ color: 'rgb(var(--eleva-danger))' }} />}
                                  <span className="text-[11px] font-semibold" style={{ color: diff >= 0 ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-danger))' }}>
                                    {diff >= 0 ? '+' : ''}{diff} ({pct >= 0 ? '+' : ''}{pct}%)
                                  </span>
                                </div>
                                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
                                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, after)}%`, background: after >= 80 ? 'rgb(var(--eleva-success))' : after >= 60 ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-danger))', transition: 'width 0.8s ease-out' }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Matched vs Missing */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-xl" style={{ background: 'rgba(var(--eleva-success-rgb), 0.06)', border: '1px solid rgba(var(--eleva-success-rgb), 0.15)' }}>
                            <h4 className="text-[10px] font-mono uppercase mb-2" style={{ color: 'rgb(var(--eleva-success))' }}>Matched Keywords</h4>
                            <div className="font-display text-2xl font-bold mb-2" style={{ color: 'rgb(var(--eleva-success))' }}>{(rescoreData.matched ?? []).length}</div>
                            <div className="flex flex-wrap gap-1">
                              {(rescoreData.matched ?? []).slice(0, 15).map((k: string) => (
                                <span key={k} className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(var(--eleva-success-rgb), 0.1)', color: 'rgb(var(--eleva-success))' }}>{k}</span>
                              ))}
                            </div>
                          </div>
                          <div className="p-4 rounded-xl" style={{ background: 'rgba(var(--eleva-danger-rgb), 0.06)', border: '1px solid rgba(var(--eleva-danger-rgb), 0.15)' }}>
                            <h4 className="text-[10px] font-mono uppercase mb-2" style={{ color: 'rgb(var(--eleva-danger))' }}>Missing Keywords</h4>
                            <div className="font-display text-2xl font-bold mb-2" style={{ color: 'rgb(var(--eleva-danger))' }}>{(rescoreData.missing ?? []).length}</div>
                            <div className="flex flex-wrap gap-1">
                              {(rescoreData.missing ?? []).slice(0, 15).map((k: string) => (
                                <span key={k} className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(var(--eleva-danger-rgb), 0.1)', color: 'rgb(var(--eleva-danger))' }}>{k}</span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Suggestions */}
                        {(rescoreData.suggestions ?? []).length > 0 && (
                          <div className="p-4 rounded-xl" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.04)', border: '1px solid rgb(var(--eleva-border))' }}>
                            <h4 className="text-[10px] font-mono uppercase mb-2" style={{ color: 'rgb(var(--eleva-primary))' }}>Recommendations</h4>
                            <div className="space-y-2">
                              {rescoreData.suggestions.map((sg, i) => (
                                <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                  <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: sg.type === 'success' ? 'rgb(var(--eleva-success))' : sg.type === 'warning' ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-primary))' }} />
                                  <div className="flex-1">
                                    <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-fg))' }}>{sg.text}</div>
                                    <div className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{sg.action}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      <BarChart3 className="w-10 h-10 mb-3 opacity-40" />
                      <p className="text-[13px]">No ATS score available.</p>
                      <p className="text-[11px] mt-1">Run the pipeline to score your resume.</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab: AI Changes */}
                <StudioChangesTab
                  tailoredResume={tailoredResume}
                  summary={summary}
                  extractData={extractData}
                  scoreData={scoreData}
                  rescoreData={rescoreData}
                  stepTimings={stepTimings}
                />
              </Tabs>
            </motion.div>
            </>
          )}
        </div>
  );
}

'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { TabsContent } from '@/components/ui/tabs';
import { AlertTriangle, X, FileCode, Pencil, FileText, Briefcase, GitCompare, CheckCircle2, Zap, Scan, BarChart3, Lightbulb, Star, TrendingUp, Mail, ArrowRight, Eye, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { StudioPipelineSummary } from '../_lib/use-studio-pipeline';
import type { ExtractedJobData, JobScore, TailoredResume } from '../_lib/studio-types';

type StudioMilestone = { icon: LucideIcon; label: string; detail: string };

interface StudioChangesTabProps {
  tailoredResume: TailoredResume | null;
  summary: StudioPipelineSummary | null;
  extractData: ExtractedJobData | null;
  scoreData: JobScore | null;
  rescoreData: JobScore | null;
  stepTimings: Record<string, number>;
}

export function StudioChangesTab({ tailoredResume, summary, extractData, scoreData, rescoreData, stepTimings }: StudioChangesTabProps) {
  return (
                <TabsContent value="changes" className="mt-0 px-5 py-4">
                  {tailoredResume ? (
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="max-w-[650px] mx-auto space-y-4">
                        {/* Hard Truth Mode */}
                        {summary?.isLowCompat && summary?.plan?.hardTruthNote && (
                          <div className="p-5 rounded-xl" style={{ background: 'rgba(var(--eleva-warning-rgb), 0.08)', border: '1px solid rgba(var(--eleva-warning-rgb), 0.2)' }}>
                            <div className="flex items-center gap-2 mb-3">
                              <AlertTriangle className="w-5 h-5" style={{ color: 'rgb(var(--eleva-warning))' }} />
                              <h4 className="text-[13px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Hard Truth — Low Job Compatibility</h4>
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                <div className="text-[9px] font-mono uppercase mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Your Resume</div>
                                <div className="font-display text-lg font-bold" style={{ color: 'rgb(var(--eleva-fg))' }}>{extractData?.role || 'Current Role'}</div>
                              </div>
                              <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                <div className="text-[9px] font-mono uppercase mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>This Role</div>
                                <div className="font-display text-lg font-bold" style={{ color: 'rgb(var(--eleva-warning))' }}>{summary?.role || 'Target Role'}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="font-display text-3xl font-bold" style={{ color: 'rgb(var(--eleva-danger))' }}>{summary.compatibility}%</span>
                              <span className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Compatibility</span>
                            </div>
                            <div className="p-3 rounded-lg mb-3" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                              <p className="text-[12px] leading-relaxed" style={{ color: 'rgb(var(--eleva-fg))' }}>{summary.plan.hardTruthNote}</p>
                            </div>
                            <div className="flex items-center gap-2 mb-1">
                              <X className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-danger))' }} />
                              <span className="text-[11px] font-medium" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Did NOT add (would fabricate experience):</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {(rescoreData?.missing ?? []).slice(0, 8).map((k: string) => (
                                <span key={k} className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(var(--eleva-danger-rgb), 0.1)', color: 'rgb(var(--eleva-danger))' }}>{k}</span>
                              ))}
                            </div>
                            <div className="mt-3 p-3 rounded-lg" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.06)' }}>
                              <span className="text-[11px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>Recommendation: </span>
                              <span className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Create a {summary?.role || 'software engineering'} version of your resume for best results. This resume was optimized for wording and transferable skills only.</span>
                            </div>
                          </div>
                        )}

                        {/* AI Rewrites Applied */}
                        <div className="p-4 rounded-xl" style={{ background: 'rgba(var(--eleva-success-rgb), 0.04)', border: '1px solid rgba(var(--eleva-success-rgb), 0.15)' }}>
                          <h4 className="text-[10px] font-mono uppercase mb-3" style={{ color: 'rgb(var(--eleva-success))' }}>AI Rewrites Applied</h4>
                          <div className="space-y-2">
                            {summary?.bulletsRewritten ? (
                              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                <Pencil className="w-4 h-4 shrink-0" style={{ color: 'rgb(var(--eleva-primary))' }} />
                                <div className="text-[13px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
                                  <strong>{summary.bulletsRewritten} bullets rewritten</strong> across {summary.sectionsModified} sections.
                                </div>
                              </div>
                            ) : null}
                            {summary?.keywordsAdded ? (
                              <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                <FileCode className="w-4 h-4 shrink-0" style={{ color: 'rgb(var(--eleva-secondary))' }} />
                                <div className="text-[13px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
                                  <strong>{summary.keywordsAdded} keywords added</strong> for better ATS ranking.
                                </div>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {/* Rewrite Confidence Per Section */}
                        {summary?.sectionConfidence && (
                          <div className="p-4 rounded-xl" style={{ border: '1px solid rgb(var(--eleva-border))' }}>
                            <h4 className="text-[10px] font-mono uppercase mb-3" style={{ color: 'rgb(var(--eleva-fg))' }}>Rewrite Confidence</h4>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                { section: 'Summary', key: 'summary' as const, icon: FileText },
                                { section: 'Skills', key: 'skills' as const, icon: FileCode },
                                { section: 'Experience', key: 'experience' as const, icon: Briefcase },
                                { section: 'Projects', key: 'projects' as const, icon: GitCompare },
                              ].map(({ section, key, icon: Icon }) => {
                                const conf = summary.sectionConfidence![key] ?? 0;
                                const changes = summary.sectionChanges?.[key] ?? [];
                                return (
                                  <div key={key} className="p-3 rounded-xl" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-1.5">
                                        <Icon className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
                                        <span className="text-[11px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{section}</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: conf >= 70 ? 'rgb(var(--eleva-success))' : conf >= 40 ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-danger))' }} />
                                        <span className="text-[11px] font-mono font-semibold" style={{ color: conf >= 70 ? 'rgb(var(--eleva-success))' : conf >= 40 ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-danger))' }}>{conf}%</span>
                                      </div>
                                    </div>
                                    {changes.length > 0 && (
                                      <div className="space-y-0.5">
                                        {changes.map((c: string, i: number) => (
                                          <div key={i} className="flex items-start gap-1.5 text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                                            <span className="w-1 h-1 rounded-full mt-1.5 shrink-0" style={{ background: 'rgb(var(--eleva-muted-fg))' }} />
                                            {c}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    <div className="mt-2 h-1 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
                                      <div className="h-full rounded-full transition-all" style={{
                                        width: `${conf}%`,
                                        background: conf >= 70 ? 'rgb(var(--eleva-success))' : conf >= 40 ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-danger))',
                                      }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Quality Check */}
                        {summary?.quality && (
                          <div className="p-4 rounded-xl" style={{ border: '1px solid rgb(var(--eleva-border))', background: summary.quality.passed ? 'rgba(var(--eleva-success-rgb), 0.03)' : 'rgba(var(--eleva-warning-rgb), 0.05)' }}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {summary.quality.passed ? (
                                  <CheckCircle2 className="w-4 h-4" style={{ color: 'rgb(var(--eleva-success))' }} />
                                ) : (
                                  <AlertTriangle className="w-4 h-4" style={{ color: 'rgb(var(--eleva-warning))' }} />
                                )}
                                <span className="text-[11px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>
                                  Quality {summary.quality.passed ? 'Check Passed' : 'Issues Found'}
                                </span>
                              </div>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(var(--eleva-card), 0.7)', color: summary.quality.score >= 80 ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-warning))' }}>
                                Score: {summary.quality.score}/100
                              </span>
                            </div>
                            {summary.quality.issues.length > 0 && (
                              <div className="space-y-1">
                                {summary.quality.issues.map((issue: string, i: number) => (
                                  <div key={i} className="flex items-start gap-2 text-[11px]">
                                    <X className="w-3 h-3 shrink-0 mt-0.5" style={{ color: 'rgb(var(--eleva-warning))' }} />
                                    <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{issue}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* AI Thinking Timeline */}
                        {summary && (
                          <div className="p-4 rounded-xl" style={{ border: '1px solid rgb(var(--eleva-border))', background: 'rgba(var(--eleva-primary-rgb), 0.02)' }}>
                            <div className="flex items-center gap-2 mb-3">
                              <Zap className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-primary))' }} />
                              <span className="text-[11px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>AI Thinking</span>
                            </div>
                            <div className="space-y-2">
                              {[
                                extractData?.role && { icon: Scan, label: 'Resume Parsed', detail: `Detected ${extractData.role} role at ${extractData.company || 'unknown'}, ${(extractData.required_skills ?? []).length} required skills` },
                                scoreData?.overall !== undefined && { icon: BarChart3, label: 'ATS Analysis', detail: `Scored at ${scoreData.overall}% — ${(scoreData.matched ?? []).length} keywords matched, ${(scoreData.missing ?? []).length} missing` },
                                summary?.plan && { icon: Lightbulb, label: 'Optimization Plan', detail: `${summary.plan.rewriteSummary ? 'Summary, ' : ''}${summary.plan.rewriteExperience ? 'Experience, ' : ''}${summary.plan.rewriteSkills ? 'Skills, ' : ''}${summary.plan.rewriteProjects ? 'Projects' : ''} — ${summary.plan.keywordsToInject} keywords targeted` },
                                summary?.sectionConfidence && { icon: Pencil, label: 'Section Rewrites', detail: `Summary (${summary.sectionConfidence.summary}%), Skills (${summary.sectionConfidence.skills}%), Experience (${summary.sectionConfidence.experience}%), Projects (${summary.sectionConfidence.projects}%)` },
                                rescoreData?.overall !== undefined && scoreData?.overall !== undefined && { icon: TrendingUp, label: 'ATS Recalculated', detail: `${scoreData.overall}% → ${rescoreData.overall}% (${rescoreData.overall >= scoreData.overall ? '+' : ''}${rescoreData.overall - scoreData.overall} pts)` },
                                summary?.review && { icon: Star, label: 'Recruiter Review', detail: `${summary.review.wouldInterview ? 'Would interview' : 'Would not interview'} — ${summary.review.strengths.length} strengths, ${summary.review.weaknesses.length} weaknesses (${summary.review.confidence}% confidence)` },
                                extractData?.role && { icon: Mail, label: 'Cover Letter', detail: `Generated for ${extractData.role} at ${extractData.company || 'company'}` },
                              ].filter((entry): entry is StudioMilestone => Boolean(entry)).map((item, i) => {
                                const Icon = item.icon;
                                const timing = stepTimings[['extract','score','plan','tailor','rescore','review','letter'][i]];
                                return (
                                  <div key={i} className="flex items-start gap-3 p-2.5 rounded-lg" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.1)' }}>
                                      <Icon className="w-3 h-3" style={{ color: 'rgb(var(--eleva-primary))' }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{item.label}</span>
                                        {timing !== undefined && (
                                          <span className="text-[9px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{(timing / 1000).toFixed(1)}s</span>
                                        )}
                                      </div>
                                      <p className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{item.detail}</p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Changes by section */}
                        <div className="space-y-3">
                          {/* Plan summary */}
                          {summary?.plan && (
                            <div className="p-4 rounded-xl" style={{ border: '1px solid rgb(var(--eleva-border))' }}>
                              <div className="flex items-center gap-2 mb-3">
                                <Zap className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-warning))' }} />
                                <span className="text-[11px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Optimization Plan</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 mb-2">
                                <div className="p-2 rounded-lg text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                  <div className="text-[9px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Summary</div>
                                  <div className="text-[11px] mt-0.5" style={{ color: summary.plan.rewriteSummary ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-muted-fg))' }}>{summary.plan.rewriteSummary ? 'Rewritten' : 'Kept'}</div>
                                </div>
                                <div className="p-2 rounded-lg text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                  <div className="text-[9px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Experience</div>
                                  <div className="text-[11px] mt-0.5" style={{ color: summary.plan.rewriteExperience ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-muted-fg))' }}>{summary.plan.rewriteExperience ? 'Rewritten' : 'Kept'}</div>
                                </div>
                                <div className="p-2 rounded-lg text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                  <div className="text-[9px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Projects</div>
                                  <div className="text-[11px] mt-0.5" style={{ color: summary.plan.rewriteProjects ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-muted-fg))' }}>{summary.plan.rewriteProjects ? 'Rewritten' : 'Kept'}</div>
                                </div>
                                <div className="p-2 rounded-lg text-center" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                  <div className="text-[9px] font-mono uppercase" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Skills</div>
                                  <div className="text-[11px] mt-0.5" style={{ color: summary.plan.rewriteSkills ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-muted-fg))' }}>{summary.plan.rewriteSkills ? 'Rewritten' : 'Kept'}</div>
                                </div>
                              </div>
                              {summary.plan.keywordsToInject > 0 && (
                                <div className="p-2 rounded-lg text-[11px]" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.06)' }}>
                                  <span style={{ color: 'rgb(var(--eleva-primary))' }}>{summary.plan.keywordsToInject} keywords targeted for injection</span>
                                </div>
                              )}
                            </div>
                          )}

                          {extractData?.summary && (
                            <div className="p-4 rounded-xl" style={{ border: '1px solid rgb(var(--eleva-border))' }}>
                              <div className="flex items-center gap-2 mb-2">
                                <Eye className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-primary))' }} />
                                <span className="text-[11px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>JD Analysis</span>
                              </div>
                              <p className="text-[12px] leading-relaxed" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{extractData.summary}</p>
                              <div className="flex items-center gap-2 mt-2">
                                {extractData.company && <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.08)', color: 'rgb(var(--eleva-primary))' }}>{extractData.company}</span>}
                                {extractData.role && <span className="text-[11px] px-2 py-0.5 rounded" style={{ background: 'rgba(var(--eleva-secondary-rgb), 0.08)', color: 'rgb(var(--eleva-secondary))' }}>{extractData.role}</span>}
                              </div>
                            </div>
                          )}

                          {/* Evidence-based ATS breakdown */}
                          {scoreData && rescoreData && (
                            <div className="p-4 rounded-xl" style={{ border: '1px solid rgb(var(--eleva-border))' }}>
                              <div className="flex items-center gap-2 mb-3">
                                <BarChart3 className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-primary))' }} />
                                <span className="text-[11px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Score Improvement — Why It Changed</span>
                              </div>
                              <div className="space-y-2">
                                {[
                                  { metric: 'Keyword', key: 'keyword' as const, reason: scoreData.keyword < rescoreData.keyword ? `Injected missing keywords, improved density.` : scoreData.keyword > rescoreData.keyword ? `Some original keywords may have been de-emphasized.` : `Keyword score stayed stable.` },
                                  { metric: 'Formatting', key: 'formatting' as const, reason: scoreData.formatting !== rescoreData.formatting ? `Restructured sections for ATS parsing.` : `Formatting score unchanged.` },
                                  { metric: 'Readability', key: 'readability' as const, reason: scoreData.readability < rescoreData.readability ? `Rewrote verbose sentences, improved bullet structure.` : scoreData.readability > rescoreData.readability ? `Some sections may be denser now.` : `Readability score unchanged.` },
                                  { metric: 'Impact', key: 'impact' as const, reason: scoreData.impact < rescoreData.impact ? `Added strong action verbs and measurable outcomes.` : scoreData.impact > rescoreData.impact ? `Impact language may have been diluted.` : `Impact score unchanged.` },
                                  { metric: 'Recruiter', key: 'recruiter' as const, reason: scoreData.recruiter < rescoreData.recruiter ? `Better alignment with role requirements.` : scoreData.recruiter > rescoreData.recruiter ? `Some role-specific language may have shifted.` : `Recruiter score stable.` },
                                ].map(({metric, key, reason}) => {
                                  const before = Number(scoreData[key] ?? 0);
                                  const after = Number(rescoreData[key] ?? 0);
                                  const diff = after - before;
                                  if (before === after) return null;
                                  return (
                                    <div key={key} className="flex items-start gap-3 p-2.5 rounded-lg" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                      <div className="shrink-0 w-14 text-center">
                                        <div className="text-[10px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{metric}</div>
                                        <div className="flex items-center justify-center gap-1 text-[11px]">
                                          <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{before}%</span>
                                          <ArrowRight className="w-2.5 h-2.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
                                          <span className="font-semibold" style={{ color: diff >= 0 ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-danger))' }}>{after}%</span>
                                        </div>
                                        <div className="text-[9px] font-mono" style={{ color: diff >= 0 ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-danger))' }}>
                                          {diff >= 0 ? '+' : ''}{diff}
                                        </div>
                                      </div>
                                      <div className="flex-1 text-[10px] leading-relaxed" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{reason}</div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Recruiter Notes */}
                          {summary?.review && (
                            <div className="p-4 rounded-xl" style={{ border: '1px solid rgb(var(--eleva-border))', background: 'rgba(var(--eleva-primary-rgb), 0.03)' }}>
                              <h4 className="text-[10px] font-mono uppercase mb-3" style={{ color: 'rgb(var(--eleva-primary))' }}>Recruiter Notes</h4>
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-[11px] font-semibold" style={{ color: summary.review.wouldInterview ? 'rgb(var(--eleva-success))' : 'rgb(var(--eleva-danger))' }}>
                                    {summary.review.wouldInterview ? '✔ Would Interview' : '✖ Would Not Interview'}
                                  </span>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.1)', color: 'rgb(var(--eleva-primary))' }}>{summary.review.score}/100 · {summary.review.confidence}% confidence</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <div className="text-[9px] font-mono uppercase mb-1" style={{ color: 'rgb(var(--eleva-success))' }}>Strengths</div>
                                    {summary.review.strengths.map((s, i) => (
                                      <div key={i} className="flex items-start gap-1.5 py-0.5 text-[11px]">
                                        <CheckCircle2 className="w-3 h-3 shrink-0 mt-0.5" style={{ color: 'rgb(var(--eleva-success))' }} />
                                        <span style={{ color: 'rgb(var(--eleva-fg))' }}>{s}</span>
                                      </div>
                                    ))}
                                  </div>
                                  <div>
                                    <div className="text-[9px] font-mono uppercase mb-1" style={{ color: 'rgb(var(--eleva-danger))' }}>Weaknesses</div>
                                    {summary.review.weaknesses.map((s, i) => (
                                      <div key={i} className="flex items-start gap-1.5 py-0.5 text-[11px]">
                                        <X className="w-3 h-3 shrink-0 mt-0.5" style={{ color: 'rgb(var(--eleva-danger))' }} />
                                        <span style={{ color: 'rgb(var(--eleva-fg))' }}>{s}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                {summary.review.genericAreas.length > 0 && (
                                  <div className="p-2.5 rounded-lg" style={{ background: 'rgba(var(--eleva-warning-rgb), 0.06)' }}>
                                    <div className="text-[9px] font-mono uppercase mb-1" style={{ color: 'rgb(var(--eleva-warning))' }}>Generic / Templated</div>
                                    {summary.review.genericAreas.map((s, i) => (
                                      <div key={i} className="text-[11px] py-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>— {s}</div>
                                    ))}
                                  </div>
                                )}
                                <div className="p-2.5 rounded-lg text-[12px]" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                  <span className="text-[9px] font-mono uppercase block mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Recommendation</span>
                                  <span style={{ color: 'rgb(var(--eleva-fg))' }}>{summary.review.recommendation}</span>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Improvement Roadmap */}
                          {summary?.review?.weaknesses && summary.review.weaknesses.length > 0 && (
                            <div className="p-4 rounded-xl" style={{ border: '1px solid rgba(var(--eleva-secondary-rgb), 0.15)', background: 'rgba(var(--eleva-secondary-rgb), 0.03)' }}>
                              <div className="flex items-center gap-2 mb-3">
                                <Target className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-secondary))' }} />
                                <span className="text-[11px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Improvement Roadmap</span>
                              </div>
                              <div className="space-y-2">
                                <div className="text-[11px] font-medium mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>To reach 80%+ compatibility with this role:</div>
                                {summary.review.weaknesses.map((w, i) => (
                                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: 'rgba(var(--eleva-card), 0.7)' }}>
                                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-mono" style={{ background: 'rgba(var(--eleva-secondary-rgb), 0.15)', color: 'rgb(var(--eleva-secondary))' }}>{i + 1}</div>
                                    <div>
                                      <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-fg))' }}>{w}</div>
                                      <div className="text-[10px] mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                                        {w.toLowerCase().includes('missing') ? 'Add relevant experience or projects in this area.' :
                                         w.toLowerCase().includes('generic') ? 'Replace generic phrasing with specific achievements.' :
                                         w.toLowerCase().includes('weak') ? 'Strengthen with measurable impact and outcomes.' :
                                         w.toLowerCase().includes('no') || w.toLowerCase().includes('lack') ? 'Consider upskilling or adding adjacent projects.' :
                                         'Review and revise this section.'}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Missing keywords */}
                          {(rescoreData?.missing ?? []).length > 0 && !summary?.isLowCompat && (
                            <div className="p-4 rounded-xl" style={{ border: '1px solid rgba(var(--eleva-danger-rgb), 0.15)', background: 'rgba(var(--eleva-danger-rgb), 0.03)' }}>
                              <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-warning))' }} />
                                <span className="text-[11px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Missing Keywords After Optimization</span>
                              </div>
                              <p className="text-[11px] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Consider adding these to your resume for a stronger match:</p>
                              <div className="flex flex-wrap gap-1">
                                {(rescoreData?.missing ?? []).slice(0, 8).map((k) => (
                                  <span key={k} className="px-2 py-0.5 rounded text-[10px] font-mono" style={{ background: 'rgba(var(--eleva-danger-rgb), 0.1)', color: 'rgb(var(--eleva-danger))' }}>{k}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      <GitCompare className="w-10 h-10 mb-3 opacity-40" />
                      <p className="text-[13px]">No changes to display.</p>
                      <p className="text-[11px] mt-1">Run the pipeline to see what AI changed.</p>
                    </div>
                  )}
                </TabsContent>
  );
}

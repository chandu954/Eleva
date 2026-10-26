'use client';

import { ScrollArea } from '@/components/ui/scroll-area';
import { TabsContent } from '@/components/ui/tabs';
import { FileText } from 'lucide-react';
import type { ExtractedJobData, TailoredResume } from '../_lib/studio-types';
import type { StudioPipelineSummary } from '../_lib/use-studio-pipeline';

interface TailoredResumePreviewProps {
  tailoredResume: TailoredResume | null;
  extractData: ExtractedJobData | null;
  summary: StudioPipelineSummary | null;
  resumes: { id: string; name: string; target_role: string | null; is_base_resume: boolean }[];
  resumeId?: string;
}

export function TailoredResumePreview({ tailoredResume, extractData, summary, resumes, resumeId }: TailoredResumePreviewProps) {
  return (
                <TabsContent value="resume" className="mt-0 px-5 py-4">
                  {tailoredResume ? (
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="max-w-[650px] mx-auto">
                        {/* A4-style resume preview */}
                        <div className="rounded-xl p-8 mb-4" style={{ background: '#fff', color: '#1a1a2e', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
                          {/* Name & Role */}
                          <div className="text-center mb-6 pb-4" style={{ borderBottom: '2px solid #1a1a2e' }}>
                            <h2 className="text-2xl font-bold tracking-tight">
                              {(() => {
                                const rawName = resumes.find(r => r.id === resumeId)?.name;
                                if (rawName && rawName.length > 40) {
                                  return extractData?.role ? `${extractData.role}${extractData.company ? ` at ${extractData.company}` : ''}` : 'Resume';
                                }
                                return rawName || 'Resume';
                              })()}
                            </h2>
                            {extractData?.role && (
                              <p className="text-[13px] mt-1 opacity-70">
                                {extractData.role}{extractData.company ? ` · ${extractData.company}` : ''}
                              </p>
                            )}
                            <p className="text-[11px] mt-1 opacity-50">
                              {summary?.compatibility !== undefined ? `Compatibility: ${summary.compatibility}% · ` : ''}
                              Tailored for {summary?.role || extractData?.role || 'target role'}
                            </p>
                          </div>

                          {/* Summary */}
                          {tailoredResume.professional_summary && (
                            <div className="mb-5">
                              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2 opacity-60">Professional Summary</h3>
                              <p className="text-[13px] leading-relaxed">{tailoredResume.professional_summary}</p>
                            </div>
                          )}

                          {/* Skills */}
                          {tailoredResume.skills?.length > 0 && (
                            <div className="mb-5">
                              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2 opacity-60">Skills</h3>
                              <div className="space-y-1.5">
                                {tailoredResume.skills.map((s, i) => (
                                  <div key={i} className="flex items-start gap-2 text-[13px]">
                                    <span className="font-semibold shrink-0 min-w-[100px]">{s.category}:</span>
                                    <span>{Array.isArray(s.skills) ? s.skills.join(', ') : Array.isArray(s.items) ? s.items.join(', ') : ''}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Work Experience */}
                          {tailoredResume.work_experience?.length > 0 && (
                            <div className="mb-5">
                              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3 opacity-60">Experience</h3>
                              {tailoredResume.work_experience.map((w, i) => (
                                <div key={i} className="mb-4">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <span className="font-bold text-[14px]">{w.position || w.role}</span>
                                      <span className="text-[13px] ml-2" style={{ color: '#555' }}>at {w.company || w.employer}</span>
                                    </div>
                                    <span className="text-[11px] shrink-0 ml-2" style={{ color: '#777' }}>{w.start_date || ''}{w.start_date && w.end_date ? ' — ' : ''}{w.end_date || ''}</span>
                                  </div>
                                  {(w.responsibilities || []).map((r: string, j: number) => (
                                    <div key={j} className="flex items-start gap-2 mt-1 text-[13px]">
                                      <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: '#333' }} />
                                      <span>{r}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Projects */}
                          {tailoredResume.projects?.length > 0 && (
                            <div className="mb-5">
                              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3 opacity-60">Projects</h3>
                              {tailoredResume.projects.map((p, i) => (
                                <div key={i} className="mb-3">
                                  <div className="font-bold text-[14px]">{p.name}</div>
                                  {(Array.isArray(p.description) ? p.description : [p.description]).filter(Boolean).map((d: string, j: number) => (
                                    <div key={j} className="flex items-start gap-2 mt-1 text-[13px]">
                                      <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: '#333' }} />
                                      <span>{d}</span>
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Education */}
                          {tailoredResume.education?.length > 0 && (
                            <div>
                              <h3 className="text-[11px] font-bold uppercase tracking-wider mb-3 opacity-60">Education</h3>
                              {tailoredResume.education.map((e, i) => (
                                <div key={i} className="mb-2 text-[13px]">
                                  <span className="font-semibold">{e.school || e.institution}</span>
                                  {e.degree && <span> — {e.degree}</span>}
                                  {e.field && <span> in {e.field}</span>}
                                  {e.date && <span className="ml-2" style={{ color: '#777' }}>{e.date}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      <FileText className="w-10 h-10 mb-3 opacity-40" />
                      <p className="text-[13px]">No tailored resume available yet.</p>
                      <p className="text-[11px] mt-1">Run the pipeline to generate one.</p>
                    </div>
                  )}
                </TabsContent>
  );
}

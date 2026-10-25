'use client';

/*
 * A4 paper preview of the resume being edited. Extracted from page.tsx.
 */

import type { ResumeData } from '../_lib/use-resume-editor';

export function ResumePreview({ data }: { data: ResumeData }) {
  return (
    <>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>A4 Preview</div>
                <div
                  className="rounded-lg mx-auto"
                  style={{
                    background: '#fff',
                    aspectRatio: '1 / 1.414',
                    maxWidth: 500,
                    boxShadow: '0 20px 50px -12px rgba(2,6,23,.35)',
                    padding: '32px 34px',
                    color: '#0f172a',
                  }}
                >
                  <div className="text-[22px] font-bold tracking-tight">{data.name || 'Your Name'}</div>
                  <div className="text-[11px] mt-0.5 text-slate-600">{data.role} · {data.location}</div>
                  <div className="text-[10px] mt-0.5 text-slate-500">{data.email}{data.linkedin ? ` · ${data.linkedin}` : ''}{data.github ? ` · ${data.github}` : ''}</div>
                  <div className="h-px my-3 bg-slate-200" />
    
                  {data.summary && (
                    <>
                      <div className="text-[10px] font-bold tracking-widest text-blue-700 uppercase mb-1.5">Summary</div>
                      <p className="text-[10px] leading-relaxed text-slate-700">{data.summary}</p>
                    </>
                  )}
    
                  {data.experience.length > 0 && (
                    <>
                      <div className="text-[10px] font-bold tracking-widest text-blue-700 uppercase mt-4 mb-1.5">Experience</div>
                      {data.experience.map((exp) => (
                        <div key={exp.id} className="mb-2.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-semibold">{exp.role}{exp.company ? ` · ${exp.company}` : ''}</span>
                            <span className="text-slate-500 font-mono text-[9px]">{exp.startDate}{exp.endDate ? ` — ${exp.endDate}` : ''}</span>
                          </div>
                          {exp.bullets.length > 0 && (
                            <ul className="mt-1 space-y-1 pl-3 list-disc text-[10px] leading-relaxed text-slate-700 marker:text-blue-600">
                              {exp.bullets.map((b) => <li key={b.id}>{b.text}</li>)}
                            </ul>
                          )}
                        </div>
                      ))}
                    </>
                  )}
    
                  {data.projects.length > 0 && (
                    <>
                      <div className="text-[10px] font-bold tracking-widest text-blue-700 uppercase mt-4 mb-1.5">Projects</div>
                      {data.projects.map((proj) => (
                        <div key={proj.id} className="mb-2">
                          <div className="text-[11px] font-semibold">{proj.name}</div>
                          {proj.description && <p className="text-[10px] text-slate-700">{proj.description}</p>}
                          {proj.technologies.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">{proj.technologies.map((t) => <span key={t} className="text-[8px] px-1 py-0.5 rounded bg-slate-100 text-slate-600">{t}</span>)}</div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
    
                  {data.skills.length > 0 && (
                    <>
                      <div className="text-[10px] font-bold tracking-widest text-blue-700 uppercase mt-4 mb-1.5">Skills</div>
                      {data.skills.map((cat) => (
                        <div key={cat.id} className="mb-1">
                          <span className="text-[9px] font-semibold text-slate-800">{cat.category}: </span>
                          <span className="text-[9px] text-slate-600">{cat.items.join(', ')}</span>
                        </div>
                      ))}
                    </>
                  )}
    
                  {data.education.length > 0 && (
                    <>
                      <div className="text-[10px] font-bold tracking-widest text-blue-700 uppercase mt-4 mb-1.5">Education</div>
                      {data.education.map((edu) => (
                        <div key={edu.id} className="flex justify-between text-[11px]">
                          <span className="font-semibold">{edu.degree} {edu.field}{edu.school ? ` · ${edu.school}` : ''}</span>
                          <span className="text-slate-500 font-mono text-[9px]">{edu.endDate || edu.startDate}</span>
                        </div>
                      ))}
                    </>
                  )}
    
                  {data.certificates.length > 0 && (
                    <>
                      <div className="text-[10px] font-bold tracking-widest text-blue-700 uppercase mt-4 mb-1.5">Certificates</div>
                      {data.certificates.map((cert) => (
                        <div key={cert.id} className="text-[11px]">
                          <span className="font-semibold">{cert.name}</span>
                          {cert.issuer && <span className="text-slate-500"> — {cert.issuer}</span>}
                          {cert.date && <span className="text-slate-500 font-mono text-[9px] ml-1">{cert.date}</span>}
                        </div>
                      ))}
                    </>
                  )}
                </div>
    </>
  );
}

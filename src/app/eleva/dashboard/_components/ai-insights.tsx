'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Target, Wrench, FileText, ArrowRight, Sparkles } from 'lucide-react';
import type { AtsReport } from './types';

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[12px]">
        <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{label}</span>
        <span className="font-mono font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{value}%</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

export function AiInsights({ latestAts, skills, resumeCount, tailoredCount }: { latestAts: AtsReport | null; skills: string[]; resumeCount: number; tailoredCount: number }) {
  return (
    <div className="rounded-xl p-5 flex flex-col" style={{ background: 'rgb(var(--eleva-card))', border: '1px solid rgb(var(--eleva-border))' }}>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4" style={{ color: 'rgb(var(--eleva-primary))' }} strokeWidth={1.75} />
        <div className="text-[15px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>AI Insights</div>
      </div>

      <div className="space-y-5 flex-1">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] mb-2.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Latest ATS Analysis
          </div>
          {latestAts ? (
            <>
              <div className="space-y-2.5">
                <Bar label="Keyword match" value={latestAts.keyword} color="rgb(var(--eleva-primary))" />
                <Bar label="Formatting" value={latestAts.formatting} color="rgb(var(--eleva-secondary))" />
              </div>
              <Link href="/eleva/ats" className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-primary))' }}>
                <Target className="w-3 h-3" />Open ATS Match <ArrowRight className="w-3 h-3" />
              </Link>
            </>
          ) : (
            <div className="text-[12px] leading-relaxed" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              Run an ATS check to see how your resume performs against job keywords.
              <Link href="/eleva/ats" className="mt-2 inline-flex items-center gap-1.5 font-medium" style={{ color: 'rgb(var(--eleva-primary))' }}>
                Run ATS Check <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] mb-2.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Skill Gaps
          </div>
          {latestAts?.missing?.length ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {latestAts.missing.slice(0, 8).map((s) => (
                  <span key={s} className="text-[12px] px-2.5 py-1 rounded-lg font-mono" style={{ background: 'rgba(var(--eleva-warning-rgb), 0.12)', color: 'rgb(var(--eleva-warning))' }}>
                    {s}
                  </span>
                ))}
                {latestAts.missing.length > 8 && (
                  <span className="text-[12px] px-2.5 py-1 rounded-lg font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                    +{latestAts.missing.length - 8}
                  </span>
                )}
              </div>
              <div className="text-[11px] mt-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                {latestAts.missing.length} skills could improve this resume
              </div>
              <Link href="/eleva/career" className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-primary))' }}>
                <Wrench className="w-3 h-3" />Review Skills <ArrowRight className="w-3 h-3" />
              </Link>
            </>
          ) : latestAts ? (
            <div className="text-[12px] leading-relaxed" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              No missing keywords — your resume already covers the latest analysis.
            </div>
          ) : (
            <div className="text-[12px] leading-relaxed" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              Run an ATS check to see which skills are missing from your resume.
              <Link href="/eleva/ats" className="mt-2 inline-flex items-center gap-1.5 font-medium" style={{ color: 'rgb(var(--eleva-primary))' }}>
                <Target className="w-3 h-3" />Run ATS Check <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] mb-2.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Skills on Profile
          </div>
          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {skills.slice(0, 8).map((s) => (
                <span key={s} className="text-[12px] px-2.5 py-1 rounded-lg" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}>
                  {s}
                </span>
              ))}
              {skills.length > 8 && (
                <span className="text-[12px] px-2.5 py-1 rounded-lg font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  +{skills.length - 8}
                </span>
              )}
            </div>
          ) : (
            <div className="text-[12px] leading-relaxed" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              Add skills to your profile so Eleva can tailor your resumes with them.
              <Link href="/eleva/career" className="mt-2 inline-flex items-center gap-1.5 font-medium" style={{ color: 'rgb(var(--eleva-primary))' }}>
                <Wrench className="w-3 h-3" />Add Skills <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.14em] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            Resumes
          </div>
          <div className="text-[13px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
            {resumeCount} total{tailoredCount > 0 ? ` · ${tailoredCount} tailored` : ''}
          </div>
          <Link href="/eleva/resumes" className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-primary))' }}>
            <FileText className="w-3 h-3" />Review Resumes <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

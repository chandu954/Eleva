'use client';

import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Target, FileText, Code2, BookOpen, Award, Brain } from 'lucide-react';

interface ResumeData {
  name: string; role: string; email: string; phone: string; location: string;
  linkedin: string; github: string; website: string; summary: string;
  experience: any[]; projects: any[]; skills: any[]; education: any[]; certificates: any[];
}

function computeHealth(data: ResumeData) {
  const hasSummary = data.summary.trim().length > 0;
  const expCount = data.experience.length;
  const projectCount = data.projects.length;
  const skillCount = data.skills.reduce((a, c) => a + c.items.length, 0);
  const eduCount = data.education.length;
  const certCount = data.certificates.length;
  const totalBullets = data.experience.reduce((a, e) => a + e.bullets.filter((b: any) => b.text.trim().length > 0).length, 0);
  const hasMetrics = data.experience.some((e: any) => e.bullets.some((b: any) => /\d/.test(b.text)));

  const completeness = Math.min(100, Math.round(
    (hasSummary ? 15 : 0) +
    Math.min(expCount * 10, 25) +
    Math.min(projectCount * 8, 16) +
    Math.min(skillCount * 2, 14) +
    (eduCount > 0 ? 10 : 0) +
    (certCount > 0 ? 5 : 0) +
    (totalBullets >= expCount * 2 ? 5 : 0) +
    (hasMetrics ? 10 : 0)
  ));

  const keywordScore = Math.min(100, Math.round(
    (skillCount > 8 ? 30 : skillCount * 3) +
    (hasMetrics ? 20 : 0) +
    (totalBullets > expCount * 2 ? 20 : totalBullets * 3) +
    (hasSummary ? 15 : 0) +
    (expCount > 1 ? 15 : expCount * 5)
  ));

  const readability = Math.min(100, Math.round(
    70 +
    (hasSummary && data.summary.length < 300 ? 10 : data.summary.length < 500 ? 5 : 0) +
    (totalBullets > 0 ? 10 : 0) +
    (expCount > 0 && expCount <= 4 ? 10 : 0)
  ));

  const formatting = Math.min(100, Math.round(
    60 +
    (hasSummary ? 10 : 0) +
    (expCount > 0 ? 8 : 0) +
    (projectCount > 0 ? 6 : 0) +
    (skillCount > 0 ? 6 : 0) +
    (eduCount > 0 ? 5 : 0) +
    (certCount > 0 ? 5 : 0)
  ));

  const experienceQuality = Math.min(100, Math.round(
    hasMetrics ? 30 : 10 +
    Math.min(totalBullets * 8, 30) +
    Math.min(expCount * 10, 20) +
    (data.experience.some((e: any) => e.company && e.role) ? 20 : 0)
  ));

  const skillsScore = Math.min(100, Math.round(
    Math.min(skillCount * 4, 40) +
    (data.skills.length > 2 ? 25 : data.skills.length * 10) +
    (skillCount > 5 ? 20 : 0) +
    (data.skills.some((s: any) => s.category && s.items.length > 0) ? 15 : 0)
  ));

  const atsScore = Math.min(100, Math.round(
    keywordScore * 0.35 + formatting * 0.25 + completeness * 0.2 + readability * 0.2
  ));

  const overall = Math.round(atsScore * 0.35 + keywordScore * 0.2 + readability * 0.15 + formatting * 0.1 + experienceQuality * 0.1 + skillsScore * 0.1);

  return { overall, atsScore, keywordScore, readability, formatting, experienceQuality, skillsScore, completeness };
}

function ProgressRing({ value, size = 72, strokeWidth = 5, color }: { value: number; size?: number; strokeWidth?: number; color?: string }) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (value / 100) * circumference;
  const c = color || 'rgb(var(--eleva-primary))';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--eleva-muted))" strokeWidth={strokeWidth} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

function Bar({ value, color, delay = 0 }: { value: number; color: string; delay?: number }) {
  return (
    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(2, value)}%` }}
        transition={{ duration: 0.8, ease: 'easeOut', delay }}
      />
    </div>
  );
}

export function ResumeHealth({ data }: { data: ResumeData }) {
  const health = computeHealth(data);
  const metrics = [
    { label: 'ATS Optimization', value: health.atsScore, color: 'rgb(var(--eleva-primary))', icon: Target },
    { label: 'Keywords', value: health.keywordScore, color: 'rgb(var(--eleva-secondary))', icon: FileText },
    { label: 'Readability', value: health.readability, color: 'rgb(var(--eleva-accent))', icon: BookOpen },
    { label: 'Formatting', value: health.formatting, color: 'rgb(var(--eleva-success))', icon: Award },
    { label: 'Experience', value: health.experienceQuality, color: 'rgb(var(--eleva-warning))', icon: Code2 },
    { label: 'Skills Coverage', value: health.skillsScore, color: 'rgb(var(--eleva-primary))', icon: Brain },
  ];

  const overallColor = health.overall >= 85 ? 'rgb(var(--eleva-success))' : health.overall >= 70 ? 'rgb(var(--eleva-primary))' : health.overall >= 50 ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-danger))';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-5"
    >
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <ProgressRing value={health.overall} size={88} strokeWidth={6} color={overallColor} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-2xl font-bold tracking-tight" style={{ color: 'rgb(var(--eleva-fg))' }}>{health.overall}</span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5" style={{ color: overallColor }} />
            <span className="text-[13px] font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>
              {health.overall >= 85 ? 'Excellent' : health.overall >= 70 ? 'Good' : health.overall >= 50 ? 'Needs Work' : 'Critical'}
            </span>
          </div>
          <p className="text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            {health.overall >= 85 ? 'Your resume is highly optimized.' :
             health.overall >= 70 ? 'A few improvements can boost your score.' :
             health.overall >= 50 ? 'Several areas need attention.' :
             'Major improvements recommended.'}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[10px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            <TrendingUp className="w-3 h-3" style={{ color: 'rgb(var(--eleva-success))' }} />
            <span>AI predicts <span style={{ color: 'rgb(var(--eleva-success))' }}>+{Math.min(15, 100 - health.overall)}%</span> with optimization</span>
          </div>
        </div>
      </div>

      <div className="h-px" style={{ background: 'rgb(var(--eleva-border))' }} />

      <div className="space-y-3">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className="space-y-1">
              <div className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3" style={{ color: m.color }} strokeWidth={1.75} />
                  <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{m.label}</span>
                </div>
                <span className="font-mono font-semibold text-[13px]" style={{ color: m.color }}>{m.value}</span>
              </div>
              <Bar value={m.value} color={m.color} delay={0.1 + i * 0.06} />
            </div>
          );
        })}
      </div>

      <div className="h-px" style={{ background: 'rgb(var(--eleva-border))' }} />

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { label: 'Sections', value: [data.summary ? 1 : 0, data.experience.length, data.projects.length, data.skills.length, data.education.length, data.certificates.length].filter(Boolean).length, color: 'rgb(var(--eleva-primary))' },
          { label: 'Bullets', value: data.experience.reduce((a: number, e: any) => a + e.bullets.length, 0), color: 'rgb(var(--eleva-secondary))' },
          { label: 'Skills', value: data.skills.reduce((a: number, c: any) => a + c.items.length, 0), color: 'rgb(var(--eleva-success))' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg py-2" style={{ background: 'rgb(var(--eleva-muted))' }}>
            <div className="font-display text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

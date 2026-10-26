'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User2, FileText, Briefcase, FolderGit2, Wrench, GraduationCap,
  Award, Lightbulb, Languages, Settings2,
} from 'lucide-react';
import type { Profile } from './_components/career-types';
import { CompletionBar, ResumeHealthCard, SectionCard } from './_components/career-ui';
import { PersonalSection, SummarySection } from './_components/career-sections-profile';
import { ExperienceSection, ProjectsSection } from './_components/career-sections-experience';
import {
  SkillsSection, EducationSection, CertificationsSection,
  AchievementsSection, LanguagesSection, PreferencesSection,
} from './_components/career-sections-more';

const SECTIONS = [
  { id: 'personal', label: 'Personal Information', icon: User2 },
  { id: 'summary', label: 'Professional Summary', icon: FileText },
  { id: 'experience', label: 'Experience', icon: Briefcase },
  { id: 'projects', label: 'Projects', icon: FolderGit2 },
  { id: 'skills', label: 'Skills', icon: Wrench },
  { id: 'education', label: 'Education', icon: GraduationCap },
  { id: 'certifications', label: 'Certifications', icon: Award },
  { id: 'achievements', label: 'Achievements', icon: Lightbulb },
  { id: 'languages', label: 'Languages', icon: Languages },
  { id: 'preferences', label: 'Preferences', icon: Settings2 },
];

function computeCompletion(profile: Profile): number {
  let score = 0;
  const p = profile || {};
  if (p.first_name || p.last_name) score++;
  if (p.headline) score++;
  if (p.professional_summary) score++;
  if (Array.isArray(p.work_experience) && p.work_experience.length > 0) score++;
  if (Array.isArray(p.education) && p.education.length > 0) score++;
  if (Array.isArray(p.skills) && p.skills.length > 0) score++;
  if (Array.isArray(p.projects) && p.projects.length > 0) score++;
  if (Array.isArray(p.certifications) && p.certifications.length > 0) score++;
  if (Array.isArray(p.achievements) && p.achievements.length > 0) score++;
  if (p.phone_number || p.email || p.linkedin_url) score++;
  return Math.round((score / 10) * 100);
}

export function CareerClient({ profile, _userId }: { profile: Profile | null; _userId: string }) {
  const p = profile || {};
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [completion] = useState(p.profile_completion ?? computeCompletion(p));

  const toggleSection = (id: string) => {
    setActiveSection(activeSection === id ? null : id);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-10 py-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
          Workspace · Career Profile
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-tight" style={{ color: 'rgb(var(--eleva-fg))' }}>
              Career Profile
            </h1>
            <p className="text-[13px] mt-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              Your single source of truth. Everything derives from here.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Progress + Resume Health */}
      <div className="grid md:grid-cols-[1fr_280px] gap-6 mb-10">
        <CompletionBar pct={completion} />
        <ResumeHealthCard completion={completion} />
      </div>

      {/* Section list */}
      <div className="space-y-3">
        {SECTIONS.map((sec) => {
          const Icon = sec.icon;
          const isOpen = activeSection === sec.id;
          return (
            <SectionCard
              key={sec.id}
              id={sec.id}
              label={sec.label}
              icon={<Icon className="w-4 h-4" />}
              isOpen={isOpen}
              onToggle={() => toggleSection(sec.id)}
            >
              {sec.id === 'personal' && <PersonalSection data={p} />}
              {sec.id === 'summary' && <SummarySection data={p} />}
              {sec.id === 'experience' && <ExperienceSection data={p} />}
              {sec.id === 'projects' && <ProjectsSection data={p} />}
              {sec.id === 'skills' && <SkillsSection data={p} />}
              {sec.id === 'education' && <EducationSection data={p} />}
              {sec.id === 'certifications' && <CertificationsSection data={p} />}
              {sec.id === 'achievements' && <AchievementsSection data={p} />}
              {sec.id === 'languages' && <LanguagesSection data={p} />}
              {sec.id === 'preferences' && <PreferencesSection data={p} />}
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}

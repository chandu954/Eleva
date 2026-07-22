'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  User2, FileText, Briefcase, FolderGit2, Wrench, GraduationCap,
  Award, Languages, Settings2, Sparkles, ChevronDown,
  Plus, Trash2, GripVertical, CheckCircle2, Loader2,
  Lightbulb, Target, Shrink, ArrowUpDown, Zap, X,
} from 'lucide-react';
import {
  savePersonal, saveSummary, saveExperience, saveProjects,
  saveSkills, saveEducation, saveCertifications, saveAchievements,
  saveLanguages, savePreferences,
} from '../_lib/actions-career';

type Profile = {
  user_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  headline?: string | null;
  email?: string | null;
  phone_number?: string | null;
  location?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  leetcode_url?: string | null;
  hackerrank_url?: string | null;
  twitter_url?: string | null;
  professional_summary?: string | null;
  photo_url?: string | null;
  work_experience?: any[];
  education?: any[];
  skills?: any[];
  projects?: any[];
  certifications?: any[];
  achievements?: any[];
  languages?: any[];
  preferences?: Record<string, any>;
  profile_completion?: number;
};

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

// ─── Shared Components ──────────────────────────────────────────────────────────

function SectionCard({ id, label, icon, isOpen, onToggle, children }: { id: string; label: string; icon: React.ReactNode; isOpen: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="eleva-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[rgb(var(--eleva-muted))]"
      >
        <span style={{ color: 'rgb(var(--eleva-primary))' }}>{icon}</span>
        <span className="flex-1 font-display text-[15px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{label}</span>
        <ChevronDown
          className="w-4 h-4 transition-transform"
          style={{ color: 'rgb(var(--eleva-muted-fg))', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key={`content-${id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
              <div className="pt-4">{children}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, textarea, mono, type }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; textarea?: boolean; mono?: boolean; type?: string }) {
  return (
    <div>
      <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full px-3 py-2 rounded-lg text-[13px] outline-none resize-none"
          style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))', fontFamily: mono ? 'Geist Mono, monospace' : undefined }}
        />
      ) : (
        <input
          type={type || 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
          style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))', fontFamily: mono ? 'Geist Mono, monospace' : undefined }}
        />
      )}
    </div>
  );
}

function SaveButton({ pending, onClick, label }: { pending: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="eleva-btn-primary text-[12px] inline-flex items-center gap-1.5"
    >
      {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
      {pending ? 'Saving...' : (label || 'Save')}
    </button>
  );
}

// ─── Completion Bar ─────────────────────────────────────────────────────────────

function CompletionBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? 'rgb(var(--eleva-success))' : pct >= 50 ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-danger))';
  return (
    <div className="eleva-card p-5">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] font-mono uppercase tracking-wider" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Profile Completion</div>
        <div className="font-display text-2xl font-bold" style={{ color }}>{pct}%</div>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgb(var(--eleva-muted))' }}>
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ background: `linear-gradient(90deg, ${color}, rgb(var(--eleva-primary)))` }}
        />
      </div>
      <div className="flex items-center gap-2 mt-2 text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
        <CheckCircle2 className="w-3 h-3" />
        {pct < 50 ? 'Start filling in your sections below' : pct < 80 ? 'Good progress! Keep going.' : 'Looking great! Ready for tailoring.'}
      </div>
    </div>
  );
}

function ResumeHealthCard({ completion }: { completion: number }) {
  const health = completion >= 80 ? 85 : completion >= 50 ? 65 : 40;
  return (
    <div className="eleva-card p-5" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,.08), rgba(124,58,237,.08))' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Resume Health</div>
        <div className="font-display text-2xl font-bold" style={{ color: 'rgb(var(--eleva-primary))' }}>{health}</div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgb(var(--eleva-bg))' }}>
        <div className="h-full rounded-full" style={{ width: `${health}%`, background: 'linear-gradient(90deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }} />
      </div>
      <div className="text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
        {health >= 80 ? 'Strong profile — ready for ATS optimization' : health >= 50 ? 'Add more sections to improve' : 'Complete your profile first'}
      </div>
    </div>
  );
}

// ─── Section: Personal ──────────────────────────────────────────────────────────

function PersonalSection({ data }: { data: Profile }) {
  const [d, setD] = useState({
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    headline: data.headline || '',
    email: data.email || '',
    phone_number: data.phone_number || '',
    location: data.location || '',
    website: data.website || '',
    linkedin_url: data.linkedin_url || '',
    github_url: data.github_url || '',
    portfolio_url: data.portfolio_url || '',
    leetcode_url: data.leetcode_url || '',
    hackerrank_url: data.hackerrank_url || '',
    twitter_url: data.twitter_url || '',
  });
  const [pending, setPending] = useState(false);

  const save = async () => {
    setPending(true);
    const r = await savePersonal(d);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Personal info saved');
    setPending(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="First Name" value={d.first_name} onChange={(v) => setD({ ...d, first_name: v })} />
        <Field label="Last Name" value={d.last_name} onChange={(v) => setD({ ...d, last_name: v })} />
      </div>
      <Field label="Headline" value={d.headline} onChange={(v) => setD({ ...d, headline: v })} placeholder="Staff Backend Engineer @ Stripe" />
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Email" value={d.email} onChange={(v) => setD({ ...d, email: v })} type="email" />
        <Field label="Phone" value={d.phone_number} onChange={(v) => setD({ ...d, phone_number: v })} />
        <Field label="Location" value={d.location} onChange={(v) => setD({ ...d, location: v })} placeholder="San Francisco, CA" />
        <Field label="Website" value={d.website} onChange={(v) => setD({ ...d, website: v })} />
      </div>
      <div className="border-t pt-4" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
        <div className="text-[10px] font-mono uppercase tracking-wider mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Links</div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="LinkedIn" value={d.linkedin_url} onChange={(v) => setD({ ...d, linkedin_url: v })} placeholder="https://linkedin.com/in/..." mono />
          <Field label="GitHub" value={d.github_url} onChange={(v) => setD({ ...d, github_url: v })} placeholder="https://github.com/..." mono />
          <Field label="Portfolio" value={d.portfolio_url} onChange={(v) => setD({ ...d, portfolio_url: v })} placeholder="https://..." mono />
          <Field label="LeetCode" value={d.leetcode_url} onChange={(v) => setD({ ...d, leetcode_url: v })} placeholder="https://leetcode.com/..." mono />
          <Field label="HackerRank" value={d.hackerrank_url} onChange={(v) => setD({ ...d, hackerrank_url: v })} placeholder="https://hackerrank.com/..." mono />
          <Field label="Twitter / X" value={d.twitter_url} onChange={(v) => setD({ ...d, twitter_url: v })} placeholder="https://x.com/..." mono />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <SaveButton pending={pending} onClick={save} />
      </div>
    </div>
  );
}

// ─── Section: Summary ───────────────────────────────────────────────────────────

function SummarySection({ data }: { data: Profile }) {
  const [summary, setSummary] = useState(data.professional_summary || '');
  const [pending, setPending] = useState(false);

  const save = async () => {
    setPending(true);
    const r = await saveSummary(summary);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Summary saved');
    setPending(false);
  };

  return (
    <div className="space-y-3">
      <Field label="Professional Summary" value={summary} onChange={setSummary} placeholder="Write a brief professional summary..." textarea />
      <div className="flex items-center gap-2 flex-wrap">
        <AIAction icon={Sparkles} label="Improve" />
        <AIAction icon={Target} label="ATS Optimize" />
        <AIAction icon={Shrink} label="Shorten" />
        <AIAction icon={ArrowUpDown} label="Senior Tone" />
        <AIAction icon={Zap} label="Executive Tone" />
      </div>
      <div className="flex justify-end pt-1">
        <SaveButton pending={pending} onClick={save} />
      </div>
    </div>
  );
}

function AIAction({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <button
      className="text-[11px] font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors hover:opacity-80"
      style={{ background: 'rgba(37,99,235,.08)', color: 'rgb(var(--eleva-primary))' }}
      onClick={() => toast.info(`AI ${label} — coming soon`)}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}

// ─── Section: Experience ────────────────────────────────────────────────────────

function ExperienceSection({ data }: { data: Profile }) {
  const [items, setItems] = useState<any[]>(data.work_experience || []);
  const [pending, setPending] = useState(false);

  const addItem = () => {
    setItems([...items, { company: '', position: '', location: '', date: '', end_date: '', current: false, description: [], achievements: [''], technologies: [] }]);
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    setItems(copy);
  };

  const updateAchievement = (idx: number, aIdx: number, value: string) => {
    const copy = [...items];
    const achievements = [...(copy[idx].achievements || [])];
    achievements[aIdx] = value;
    copy[idx] = { ...copy[idx], achievements };
    setItems(copy);
  };

  const addAchievement = (idx: number) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], achievements: [...(copy[idx].achievements || []), ''] };
    setItems(copy);
  };

  const removeAchievement = (idx: number, aIdx: number) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], achievements: (copy[idx].achievements || []).filter((_: any, i: number) => i !== aIdx) };
    setItems(copy);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const save = async () => {
    setPending(true);
    const clean = items.map((item) => ({
      ...item,
      achievements: (item.achievements || []).filter((a: string) => a.trim()),
      description: (item.description || []).filter((d: string) => d.trim()),
    }));
    const r = await saveExperience(clean);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Experience saved');
    setPending(false);
  };

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="p-4 rounded-xl" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="flex items-center gap-2 mb-3">
            <GripVertical className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
            <span className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>Role {idx + 1}</span>
            <button onClick={() => removeItem(idx)} className="ml-auto text-[11px] px-2 py-1 rounded-md" style={{ color: 'rgb(var(--eleva-danger))' }}>
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Company" value={item.company || ''} onChange={(v) => updateItem(idx, 'company', v)} />
            <Field label="Position" value={item.position || ''} onChange={(v) => updateItem(idx, 'position', v)} />
            <Field label="Location" value={item.location || ''} onChange={(v) => updateItem(idx, 'location', v)} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Start Date" value={item.date || ''} onChange={(v) => updateItem(idx, 'date', v)} placeholder="Jan 2023" />
              {!item.current && <Field label="End Date" value={item.end_date || ''} onChange={(v) => updateItem(idx, 'end_date', v)} placeholder="Present" />}
            </div>
          </div>
          <label className="flex items-center gap-2 mt-2 text-[12px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
            <input type="checkbox" checked={!!item.current} onChange={(e) => updateItem(idx, 'current', e.target.checked)} className="rounded" />
            Currently working here
          </label>
          <div className="mt-3">
            <div className="text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Achievements</div>
            {(item.achievements || []).map((a: string, aIdx: number) => (
              <div key={aIdx} className="flex items-start gap-2 mb-1.5">
                <span className="mt-2 text-[10px]" style={{ color: 'rgb(var(--eleva-primary))' }}>▸</span>
                <input
                  value={a}
                  onChange={(e) => updateAchievement(idx, aIdx, e.target.value)}
                  placeholder="Built a distributed system that..."
                  className="flex-1 px-3 py-1.5 rounded-md text-[13px] outline-none"
                  style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-fg))' }}
                />
                <button onClick={() => removeAchievement(idx, aIdx)} className="mt-1.5 text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button onClick={() => addAchievement(idx)} className="text-[11px] font-medium mt-1 inline-flex items-center gap-1" style={{ color: 'rgb(var(--eleva-primary))' }}>
              <Plus className="w-3 h-3" /> Add achievement
            </button>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={addItem} className="text-[12px] font-medium px-4 py-2 rounded-lg inline-flex items-center gap-1.5 transition-colors" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-primary))' }}>
          <Plus className="w-3.5 h-3.5" /> Add Experience
        </button>
        <div className="ml-auto">
          <SaveButton pending={pending} onClick={save} />
        </div>
      </div>
    </div>
  );
}

// ─── Section: Projects ──────────────────────────────────────────────────────────

function ProjectsSection({ data }: { data: Profile }) {
  const [items, setItems] = useState<any[]>(data.projects || []);
  const [pending, setPending] = useState(false);

  const addItem = () => setItems([...items, { name: '', description: [''], technologies: [], url: '', github_url: '', date: '' }]);
  const updateItem = (idx: number, field: string, value: any) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    setItems(copy);
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const save = async () => {
    setPending(true);
    const r = await saveProjects(items);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Projects saved');
    setPending(false);
  };

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="p-4 rounded-xl" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="flex items-center gap-2 mb-3">
            <GripVertical className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
            <span className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{item.name || `Project ${idx + 1}`}</span>
            <button onClick={() => removeItem(idx)} className="ml-auto" style={{ color: 'rgb(var(--eleva-danger))' }}><Trash2 className="w-3 h-3" /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Project Name" value={item.name || ''} onChange={(v) => updateItem(idx, 'name', v)} />
            <Field label="Date" value={item.date || ''} onChange={(v) => updateItem(idx, 'date', v)} placeholder="2024" />
            <Field label="GitHub URL" value={item.github_url || ''} onChange={(v) => updateItem(idx, 'github_url', v)} mono />
            <Field label="Live Demo URL" value={item.url || ''} onChange={(v) => updateItem(idx, 'url', v)} mono />
          </div>
          <div className="mt-3">
            <Field label="Description" value={(item.description || []).join('\n')} onChange={(v) => updateItem(idx, 'description', v.split('\n').filter(Boolean))} placeholder="Describe the project..." textarea />
          </div>
          <div className="mt-2">
            <Field label="Tech Stack (comma separated)" value={(item.technologies || []).join(', ')} onChange={(v) => updateItem(idx, 'technologies', v.split(',').map((s: string) => s.trim()).filter(Boolean))} placeholder="React, Go, PostgreSQL" />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={addItem} className="text-[12px] font-medium px-4 py-2 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-primary))' }}>
          <Plus className="w-3.5 h-3.5" /> Add Project
        </button>
        <div className="ml-auto"><SaveButton pending={pending} onClick={save} /></div>
      </div>
    </div>
  );
}

// ─── Section: Skills ────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = ['Languages', 'Frameworks', 'Cloud & Infrastructure', 'Databases', 'AI & ML', 'DevOps & Tools', 'Design'];

function SkillsSection({ data }: { data: Profile }) {
  const [items, setItems] = useState<any[]>(data.skills || []);
  const [pending, setPending] = useState(false);

  const addCategory = (cat: string) => {
    if (!cat.trim() || items.some((i) => i.category === cat)) return;
    setItems([...items, { category: cat, items: [] }]);
  };

  const addSkill = (idx: number, skill: string) => {
    if (!skill.trim()) return;
    const copy = [...items];
    copy[idx] = { ...copy[idx], items: [...(copy[idx].items || []), skill.trim()] };
    setItems(copy);
  };

  const removeSkill = (idx: number, sIdx: number) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], items: (copy[idx].items || []).filter((_: any, i: number) => i !== sIdx) };
    setItems(copy);
  };

  const removeCategory = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const save = async () => {
    setPending(true);
    const r = await saveSkills(items);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Skills saved');
    setPending(false);
  };

  return (
    <div className="space-y-4">
      {items.map((cat, idx) => (
        <div key={idx} className="p-4 rounded-xl" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{cat.category}</span>
            <button onClick={() => removeCategory(idx)} className="ml-auto" style={{ color: 'rgb(var(--eleva-muted-fg))' }}><X className="w-3 h-3" /></button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(cat.items || []).map((skill: string, sIdx: number) => (
              <span key={sIdx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-fg))' }}>
                {skill}
                <button onClick={() => removeSkill(idx, sIdx)} className="hover:opacity-60"><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
          </div>
          <SkillInput onAdd={(s) => addSkill(idx, s)} placeholder={`Add skill to ${cat.category}...`} />
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {DEFAULT_CATEGORIES.filter((c) => !items.some((i) => i.category === c)).map((cat) => (
          <button key={cat} onClick={() => addCategory(cat)} className="text-[10px] font-mono px-2.5 py-1 rounded-full" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
            + {cat}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <SaveButton pending={pending} onClick={save} />
      </div>
    </div>
  );
}

function SkillInput({ onAdd, placeholder }: { onAdd: (s: string) => void; placeholder: string }) {
  const [val, setVal] = useState('');
  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && val.trim()) {
      e.preventDefault();
      onAdd(val);
      setVal('');
    }
  };
  return (
    <input
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={handleKey}
      placeholder={placeholder}
      className="w-full px-3 py-1.5 rounded-md text-[12px] outline-none"
      style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-fg))' }}
    />
  );
}

// ─── Section: Education ─────────────────────────────────────────────────────────

function EducationSection({ data }: { data: Profile }) {
  const [items, setItems] = useState<any[]>(data.education || []);
  const [pending, setPending] = useState(false);

  const addItem = () => setItems([...items, { school: '', degree: '', field: '', location: '', date: '', gpa: '', achievements: [] }]);
  const updateItem = (idx: number, field: string, value: any) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    setItems(copy);
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const save = async () => {
    setPending(true);
    const r = await saveEducation(items);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Education saved');
    setPending(false);
  };

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="p-4 rounded-xl" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{item.school || `School ${idx + 1}`}</span>
            <button onClick={() => removeItem(idx)} className="ml-auto" style={{ color: 'rgb(var(--eleva-danger))' }}><Trash2 className="w-3 h-3" /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="School" value={item.school || ''} onChange={(v) => updateItem(idx, 'school', v)} />
            <Field label="Degree" value={item.degree || ''} onChange={(v) => updateItem(idx, 'degree', v)} placeholder="Bachelor of Science" />
            <Field label="Field of Study" value={item.field || ''} onChange={(v) => updateItem(idx, 'field', v)} placeholder="Computer Science" />
            <Field label="Location" value={item.location || ''} onChange={(v) => updateItem(idx, 'location', v)} />
            <Field label="Graduation Date" value={item.date || ''} onChange={(v) => updateItem(idx, 'date', v)} placeholder="2020" />
            <Field label="GPA" value={item.gpa || ''} onChange={(v) => updateItem(idx, 'gpa', v)} placeholder="3.8/4.0" />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={addItem} className="text-[12px] font-medium px-4 py-2 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-primary))' }}>
          <Plus className="w-3.5 h-3.5" /> Add Education
        </button>
        <div className="ml-auto"><SaveButton pending={pending} onClick={save} /></div>
      </div>
    </div>
  );
}

// ─── Section: Certifications ────────────────────────────────────────────────────

function CertificationsSection({ data }: { data: Profile }) {
  const [items, setItems] = useState<any[]>(data.certifications || []);
  const [pending, setPending] = useState(false);

  const addItem = () => setItems([...items, { name: '', issuer: '', date: '', url: '' }]);
  const updateItem = (idx: number, field: string, value: any) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    setItems(copy);
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const save = async () => {
    setPending(true);
    const r = await saveCertifications(items);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Certifications saved');
    setPending(false);
  };

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="p-4 rounded-xl" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{item.name || `Cert ${idx + 1}`}</span>
            <button onClick={() => removeItem(idx)} className="ml-auto" style={{ color: 'rgb(var(--eleva-danger))' }}><Trash2 className="w-3 h-3" /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Name" value={item.name || ''} onChange={(v) => updateItem(idx, 'name', v)} placeholder="AWS Solutions Architect" />
            <Field label="Issuer" value={item.issuer || ''} onChange={(v) => updateItem(idx, 'issuer', v)} placeholder="Amazon Web Services" />
            <Field label="Date" value={item.date || ''} onChange={(v) => updateItem(idx, 'date', v)} placeholder="2024" />
            <Field label="Credential URL" value={item.url || ''} onChange={(v) => updateItem(idx, 'url', v)} mono />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={addItem} className="text-[12px] font-medium px-4 py-2 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-primary))' }}>
          <Plus className="w-3.5 h-3.5" /> Add Certification
        </button>
        <div className="ml-auto"><SaveButton pending={pending} onClick={save} /></div>
      </div>
    </div>
  );
}

// ─── Section: Achievements ──────────────────────────────────────────────────────

function AchievementsSection({ data }: { data: Profile }) {
  const [items, setItems] = useState<any[]>(data.achievements || []);
  const [pending, setPending] = useState(false);

  const addItem = () => setItems([...items, { title: '', description: '', date: '', type: 'achievement' }]);
  const updateItem = (idx: number, field: string, value: any) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    setItems(copy);
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const save = async () => {
    setPending(true);
    const r = await saveAchievements(items);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Achievements saved');
    setPending(false);
  };

  const typeOptions = ['achievement', 'award', 'hackathon', 'publication', 'patent'];

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="p-4 rounded-xl" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{item.title || `Achievement ${idx + 1}`}</span>
            <button onClick={() => removeItem(idx)} className="ml-auto" style={{ color: 'rgb(var(--eleva-danger))' }}><Trash2 className="w-3 h-3" /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Title" value={item.title || ''} onChange={(v) => updateItem(idx, 'title', v)} placeholder="1st Place Hackathon" />
            <Field label="Date" value={item.date || ''} onChange={(v) => updateItem(idx, 'date', v)} placeholder="2024" />
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Type</label>
              <select
                value={item.type || 'achievement'}
                onChange={(e) => updateItem(idx, 'type', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-fg))' }}
              >
                {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-2">
            <Field label="Description" value={item.description || ''} onChange={(v) => updateItem(idx, 'description', v)} placeholder="Describe the achievement..." textarea />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={addItem} className="text-[12px] font-medium px-4 py-2 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-primary))' }}>
          <Plus className="w-3.5 h-3.5" /> Add Achievement
        </button>
        <div className="ml-auto"><SaveButton pending={pending} onClick={save} /></div>
      </div>
    </div>
  );
}

// ─── Section: Languages ─────────────────────────────────────────────────────────

const PROFICIENCIES = ['native', 'fluent', 'advanced', 'intermediate', 'basic'];

function LanguagesSection({ data }: { data: Profile }) {
  const [items, setItems] = useState<any[]>(data.languages || []);
  const [pending, setPending] = useState(false);

  const addItem = () => setItems([...items, { language: '', proficiency: 'native' }]);
  const updateItem = (idx: number, field: string, value: any) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    setItems(copy);
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const save = async () => {
    setPending(true);
    const r = await saveLanguages(items);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Languages saved');
    setPending(false);
  };

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-end gap-3 p-3 rounded-xl" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="flex-1">
            <Field label="Language" value={item.language || ''} onChange={(v) => updateItem(idx, 'language', v)} placeholder="English" />
          </div>
          <div className="w-40">
            <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Proficiency</label>
            <select
              value={item.proficiency || 'native'}
              onChange={(e) => updateItem(idx, 'proficiency', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
              style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-fg))' }}
            >
              {PROFICIENCIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button onClick={() => removeItem(idx)} className="mb-1" style={{ color: 'rgb(var(--eleva-danger))' }}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={addItem} className="text-[12px] font-medium px-4 py-2 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-primary))' }}>
          <Plus className="w-3.5 h-3.5" /> Add Language
        </button>
        <div className="ml-auto"><SaveButton pending={pending} onClick={save} /></div>
      </div>
    </div>
  );
}

// ─── Section: Preferences ───────────────────────────────────────────────────────

function PreferencesSection({ data }: { data: Profile }) {
  const prefs = data.preferences || {};
  const [d, setD] = useState({
    preferred_role: prefs.preferred_role || '',
    preferred_location: prefs.preferred_location || '',
    work_preference: prefs.work_preference || 'remote',
    salary_expectation: prefs.salary_expectation || '',
    visa_required: prefs.visa_required || false,
    open_to_relocation: prefs.open_to_relocation || false,
    employment_types: prefs.employment_types || [],
    target_industries: prefs.target_industries || [],
  });
  const [industriesInput, setIndustriesInput] = useState((d.target_industries || []).join(', '));
  const [pending, setPending] = useState(false);

  const save = async () => {
    setPending(true);
    const payload = {
      ...d,
      target_industries: industriesInput.split(',').map((s: string) => s.trim()).filter(Boolean),
    };
    const r = await savePreferences(payload);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Preferences saved');
    setPending(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Preferred Role" value={d.preferred_role} onChange={(v) => setD({ ...d, preferred_role: v })} placeholder="Backend Engineer" />
        <Field label="Preferred Location" value={d.preferred_location} onChange={(v) => setD({ ...d, preferred_location: v })} placeholder="San Francisco, CA" />
        <Field label="Salary Expectation" value={d.salary_expectation} onChange={(v) => setD({ ...d, salary_expectation: v })} placeholder="$150,000 - $200,000" />
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Work Preference</label>
          <select
            value={d.work_preference}
            onChange={(e) => setD({ ...d, work_preference: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
            style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}
          >
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="in_person">In Person</option>
            <option value="any">Any</option>
          </select>
        </div>
      </div>
      <Field label="Target Industries (comma separated)" value={industriesInput} onChange={setIndustriesInput} placeholder="Fintech, HealthTech, AI" />
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-[13px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
          <input type="checkbox" checked={d.visa_required} onChange={(e) => setD({ ...d, visa_required: e.target.checked })} className="rounded" />
          Visa sponsorship required
        </label>
        <label className="flex items-center gap-2 text-[13px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
          <input type="checkbox" checked={d.open_to_relocation} onChange={(e) => setD({ ...d, open_to_relocation: e.target.checked })} className="rounded" />
          Open to relocation
        </label>
      </div>
      <div className="flex justify-end pt-2">
        <SaveButton pending={pending} onClick={save} />
      </div>
    </div>
  );
}
